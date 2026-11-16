// deno-lint-ignore-file no-import-prefix
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { Approvals } from "./approvals.ts";
import { verifyChain } from "./audit.ts";
import { Ledger, LedgerError, simple } from "./ledger.ts";
import { allocate, formatMajor, money, parseMajor } from "./money.ts";
import { internalRows, reconcile } from "./reconcile.ts";

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as LedgerError).code ?? (e as Error).name;
  }
  return null;
};
const USD = (n: bigint | number) => money(n, "USD");

function setup() {
  const l = new Ledger(() => new Date("2026-01-01T00:00:00Z"));
  l.openAccount({ id: "bank", currency: "USD", normal: "debit" }, "system");
  l.openAccount({ id: "alice", currency: "USD", normal: "credit", noOverdraft: true }, "system");
  l.openAccount({ id: "bob", currency: "USD", normal: "credit", noOverdraft: true }, "system");
  l.openAccount({ id: "eur-bank", currency: "EUR", normal: "debit" }, "system");
  l.post(simple("deposit-alice-1", "bank", "alice", USD(10_000), "deposit", "BANK-1"), "ops");
  return l;
}

Deno.test("money: no floats, exact parsing and formatting", () => {
  assertEquals(code(() => money(0.1 + 0.2, "USD")), "RangeError");
  assertEquals(code(() => money(1.5, "USD")), "RangeError");
  assertEquals(code(() => money(Number.MAX_SAFE_INTEGER + 2, "USD")), "RangeError");
  assertEquals(code(() => money("12.3", "USD")), "RangeError");
  assertEquals(code(() => money(1, "XXX")), "RangeError");
  assertEquals(parseMajor("12.34", "USD").amount, 1234n);
  assertEquals(parseMajor("12.3", "USD").amount, 1230n);
  assertEquals(parseMajor("500", "JPY").amount, 500n);
  assertEquals(code(() => parseMajor("12.345", "USD")), "RangeError");
  assertEquals(formatMajor(USD(-5)), "-0.05 USD");
  assertEquals(formatMajor(money(1234567n, "USD")), "12345.67 USD");
  assertEquals(formatMajor(money(7n, "JPY")), "7 JPY");
});

Deno.test("money: allocation never loses or invents a cent", () => {
  const parts = allocate(USD(100), [1n, 1n, 1n]);
  assertEquals(parts.map((p) => p.amount), [34n, 33n, 33n]);
  for (const total of [0n, 1n, 99n, 1001n, -101n]) {
    for (const w of [[1n], [1n, 2n, 3n], [5n, 0n, 5n], [7n, 11n, 13n, 17n]]) {
      assertEquals(allocate(USD(total), w).reduce((s, p) => s + p.amount, 0n), total, `${total} / ${w}`);
    }
  }
});

Deno.test("ledger: balanced entries only", () => {
  const l = setup();
  const bad = (lines: Parameters<Ledger["post"]>[0]["lines"], key = "k-unbalanced") =>
    code(() => l.post({ idempotencyKey: key, description: "x", lines }, "ops"));
  assertEquals(
    bad([{ accountId: "alice", direction: "debit", amount: USD(100) }, {
      accountId: "bob",
      direction: "credit",
      amount: USD(99),
    }]),
    "unbalanced",
  );
  assertEquals(bad([{ accountId: "alice", direction: "debit", amount: USD(100) }]), "too_few_lines");
  assertEquals(
    bad([{ accountId: "alice", direction: "debit", amount: USD(0) }, {
      accountId: "bob",
      direction: "credit",
      amount: USD(0),
    }]),
    "non_positive",
  );
  assertEquals(
    bad([{ accountId: "alice", direction: "debit", amount: USD(-5) }, {
      accountId: "bob",
      direction: "credit",
      amount: USD(-5),
    }]),
    "non_positive",
  );
  assertEquals(
    bad([{ accountId: "alice", direction: "debit", amount: USD(5) }, {
      accountId: "nobody",
      direction: "credit",
      amount: USD(5),
    }]),
    "unknown_account",
  );
  assertEquals(
    bad([{ accountId: "alice", direction: "debit", amount: USD(5) }, {
      accountId: "eur-bank",
      direction: "credit",
      amount: money(5, "EUR"),
    }]),
    "mixed_currency",
  );
  assertEquals(
    bad([{ accountId: "eur-bank", direction: "debit", amount: USD(5) }, {
      accountId: "bob",
      direction: "credit",
      amount: USD(5),
    }]),
    "account_currency",
  );
  assertEquals(l.transactions.length, 1, "rejected postings leave no trace");
  assertEquals(l.trialBalance("USD"), 0n);
});

Deno.test("ledger: three-way split stays balanced and the trial balance is zero", () => {
  const l = setup();
  l.openAccount({ id: "fees", currency: "USD", normal: "credit" }, "system");
  l.post({
    idempotencyKey: "split-0001",
    description: "payment with fee",
    lines: [
      { accountId: "alice", direction: "debit", amount: USD(1000) },
      { accountId: "bob", direction: "credit", amount: USD(970) },
      { accountId: "fees", direction: "credit", amount: USD(30) },
    ],
  }, "ops");
  assertEquals(l.balance("alice").amount, 9000n);
  assertEquals(l.balance("bob").amount, 970n);
  assertEquals(l.trialBalance("USD"), 0n);
});

Deno.test("ledger: idempotency", () => {
  const l = setup();
  const p = simple("pay-0001", "alice", "bob", USD(2500), "pay bob");
  const first = l.post(p, "api");
  const again = l.post(structuredClone({ ...p, lines: p.lines.map((x) => ({ ...x })) }), "api");
  assertEquals(first.replayed, false);
  assertEquals(again.replayed, true);
  assertEquals(again.tx.id, first.tx.id);
  assertEquals(l.balance("bob").amount, 2500n, "applied once");
  assertEquals(l.transactions.length, 2);
  assertEquals(
    code(() => l.post(simple("pay-0001", "alice", "bob", USD(2501), "other"), "api")),
    "idempotency_conflict",
  );
  assertEquals(code(() => l.post(simple("short", "alice", "bob", USD(1), "x"), "api")), "idempotency_key");
  assertEquals(code(() => l.post(simple("pay-0002", "alice", "bob", USD(1), "x"), "")), "actor_required");
});

Deno.test("ledger: no overdraft, and a failed post changes nothing", () => {
  const l = setup();
  assertEquals(
    code(() => l.post(simple("pay-big01", "alice", "bob", USD(10_001), "too much"), "api")),
    "insufficient_funds",
  );
  assertEquals(l.balance("alice").amount, 10_000n);
  assertEquals(l.balance("bob").amount, 0n);
  l.post(simple("pay-all01", "alice", "bob", USD(10_000), "all"), "api");
  assertEquals(l.balance("alice").amount, 0n);
});

Deno.test("ledger: entries are immutable, mistakes are reversed once", () => {
  const l = setup();
  const { tx } = l.post(simple("pay-0003", "alice", "bob", USD(400), "pay"), "api");
  assertThrows(() => {
    (tx as { id: string }).id = "x";
  }, TypeError);
  assertThrows(() => {
    (tx.lines[0] as { amount: unknown }).amount = USD(1);
  }, TypeError);
  const rev = l.reverse(tx.id, "rev-0003-a", "ops", "customer dispute");
  assertEquals(l.balance("alice").amount, 10_000n);
  assertEquals(l.balance("bob").amount, 0n);
  assertEquals(l.transactions.length, 3, "history kept: deposit, payment, reversal");
  assertEquals(l.reverse(tx.id, "rev-0003-a", "ops", "customer dispute").replayed, true);
  assertEquals(code(() => l.reverse(tx.id, "rev-0003-b", "ops", "again")), "already_reversed");
  assertEquals(code(() => l.reverse(rev.tx.id, "rev-0003-c", "ops", "undo")), "already_reversal");
  assertEquals(l.trialBalance("USD"), 0n);
});

Deno.test("audit: every post is logged and tampering is detected", () => {
  const l = setup();
  l.post(simple("pay-0004", "alice", "bob", USD(1), "pay"), "api");
  const ev = [...l.audit.events];
  assert(ev.length >= 5);
  assertEquals(verifyChain(ev), null);
  assertEquals(ev.at(-1)?.actor, "api");
  const edited = ev.map((e) => ({ ...e }));
  edited[2]!.actor = "someone-else";
  assertEquals(verifyChain(edited), 3);
  assertEquals(verifyChain(ev.filter((_, i) => i !== 1)), 3, "deleting an event breaks the chain");
});

Deno.test("maker-checker: four eyes", () => {
  const l = setup();
  const a = new Approvals(l, { soloLimit: { USD: 1000n }, canApprove: (u) => u.startsWith("checker") });
  const small = a.submit("maker1", simple("pay-small1", "alice", "bob", USD(1000), "small"));
  assert("posted" in small);
  const big = a.submit("maker1", simple("pay-large1", "alice", "bob", USD(5000), "large"));
  assert("request" in big);
  assertEquals(l.balance("bob").amount, 1000n, "nothing posted before approval");
  const id = big.request.id;
  assertEquals(code(() => a.approve(id, "maker1")), "self_approval");
  assertEquals(code(() => a.approve(id, "random-user")), "not_authorised");
  const done = a.approve(id, "checker1");
  assertEquals(done.status, "approved");
  assertEquals(l.balance("bob").amount, 6000n);
  assertEquals(code(() => a.approve(id, "checker2")), "not_pending");
  const other = a.submit("maker1", simple("pay-large2", "alice", "bob", USD(2000), "large 2"));
  assert("request" in other);
  assertEquals(a.reject(other.request.id, "checker1", "unclear purpose").status, "rejected");
  assertEquals(l.balance("bob").amount, 6000n);
  assertEquals(verifyChain(l.audit.events), null);
});

Deno.test("reconciliation finds every kind of difference", () => {
  const l = setup();
  l.post(simple("pay-r0001", "alice", "bob", USD(100), "a", "R1"), "api");
  l.post(simple("pay-r0002", "alice", "bob", USD(200), "b", "R2"), "api");
  l.post(simple("pay-r0003", "alice", "bob", USD(300), "c", "R3"), "api");
  const mine = internalRows(l, "bob");
  assertEquals(reconcile(mine, mine.map(({ txId: _t, ...r }) => r)).ok, true);
  const bank = [
    { ref: "R1", amount: -100n, currency: "USD" }, // credit to bob = negative in debit-positive rows
    { ref: "R2", amount: 200n, currency: "USD" }, // wrong sign
    { ref: "R4", amount: 50n, currency: "USD" },
  ];
  const rep = reconcile(mine, bank);
  assertEquals(rep.ok, false);
  assertEquals(rep.matched, 1);
  assertEquals(rep.amountMismatch.map((m) => m.ref), ["R2"]);
  assertEquals(rep.missingExternally.map((m) => m.ref), ["R3"]);
  assertEquals(rep.missingInternally.map((m) => m.ref), ["R4"]);
  assertEquals(reconcile([...mine, mine[0]!], mine).duplicates.length, 1);
});
