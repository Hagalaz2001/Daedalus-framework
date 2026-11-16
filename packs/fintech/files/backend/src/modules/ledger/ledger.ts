// Double-entry ledger core, storage-independent. Rules it enforces:
//  - every transaction has >= 2 lines and total debits == total credits, in one currency;
//  - amounts are positive integers of minor units (see money.ts);
//  - posting is idempotent: same key + same content returns the original, same key + other content is an error;
//  - entries are never changed or deleted: a mistake is fixed by posting a reversal;
//  - accounts flagged `noOverdraft` never go below zero;
//  - every post writes an audit event naming the actor.
// This in-memory class is the reference behaviour and the test oracle. Production storage must give the same
// guarantees in the database (ledger.sql does) because two app instances can post at the same time.
import { AuditLog, canonical, sha256 } from "./audit.ts";
import { type Money, money } from "./money.ts";

export type Direction = "debit" | "credit";
export interface Account {
  id: string;
  currency: string;
  /** The side that increases the balance: assets/expenses are debit-normal, liabilities/equity/income credit-normal. */
  normal: Direction;
  noOverdraft?: boolean;
}
export interface Line {
  accountId: string;
  direction: Direction;
  amount: Money;
}
export interface Posting {
  idempotencyKey: string;
  description: string;
  lines: Line[];
  /** Business reference (order id, bank reference). Used by reconciliation. */
  ref?: string;
}
export interface Transaction extends Posting {
  readonly id: string;
  readonly seq: number;
  readonly postedAt: string;
  readonly reverses?: string;
  readonly contentHash: string;
}

export class LedgerError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export class Ledger {
  #accounts = new Map<string, Account>();
  #txs: Transaction[] = [];
  #byKey = new Map<string, Transaction>();
  #balances = new Map<string, bigint>(); // signed: debits positive, credits negative
  readonly audit: AuditLog;

  constructor(private now: () => Date = () => new Date()) {
    this.audit = new AuditLog(now);
  }

  openAccount(a: Account, actor: string): void {
    if (this.#accounts.has(a.id)) throw new LedgerError("account_exists", `account ${a.id} exists`);
    this.#accounts.set(a.id, Object.freeze({ ...a }));
    this.audit.append(actor, "account.open", a.id, a);
  }

  /** Balance in the account's normal direction (a customer wallet, credit-normal, shows positive when funded). */
  balance(accountId: string): Money {
    const a = this.#need(accountId);
    const signed = this.#balances.get(accountId) ?? 0n;
    return money(a.normal === "debit" ? signed : -signed, a.currency);
  }

  get transactions(): readonly Transaction[] {
    return this.#txs;
  }

  /** Debits minus credits over every account of a currency. Must be 0 always; a non-zero value means corruption. */
  trialBalance(currency: string): bigint {
    let sum = 0n;
    for (const [id, v] of this.#balances) if (this.#accounts.get(id)?.currency === currency) sum += v;
    return sum;
  }

  post(p: Posting, actor: string, reverses?: string): { tx: Transaction; replayed: boolean } {
    if (!actor) throw new LedgerError("actor_required", "every posting needs an actor");
    if (!p.idempotencyKey || p.idempotencyKey.length < 8) {
      throw new LedgerError("idempotency_key", "idempotencyKey must be at least 8 characters");
    }
    const contentHash = sha256(canonical({ d: p.description, l: p.lines, r: p.ref, rev: reverses }));
    const prior = this.#byKey.get(p.idempotencyKey);
    if (prior) {
      if (prior.contentHash !== contentHash) {
        throw new LedgerError("idempotency_conflict", "this key was used for a different posting");
      }
      return { tx: prior, replayed: true };
    }
    this.#validate(p);

    const deltas = new Map<string, bigint>();
    for (const l of p.lines) {
      deltas.set(
        l.accountId,
        (deltas.get(l.accountId) ?? 0n) + (l.direction === "debit" ? l.amount.amount : -l.amount.amount),
      );
    }
    for (const [id, d] of deltas) {
      const a = this.#need(id);
      const next = (this.#balances.get(id) ?? 0n) + d;
      const shown = a.normal === "debit" ? next : -next;
      if (a.noOverdraft && shown < 0n) throw new LedgerError("insufficient_funds", `account ${id} would go negative`);
    }

    const tx: Transaction = Object.freeze({
      ...p,
      lines: Object.freeze(p.lines.map((l) => Object.freeze({ ...l }))) as Line[],
      id: crypto.randomUUID(),
      seq: this.#txs.length + 1,
      postedAt: this.now().toISOString(),
      reverses,
      contentHash,
    });
    for (const [id, d] of deltas) this.#balances.set(id, (this.#balances.get(id) ?? 0n) + d);
    this.#txs.push(tx);
    this.#byKey.set(p.idempotencyKey, tx);
    this.audit.append(actor, reverses ? "tx.reverse" : "tx.post", tx.id, {
      key: p.idempotencyKey,
      hash: contentHash,
      ref: p.ref,
    });
    return { tx, replayed: false };
  }

  /** Corrects a transaction by posting the opposite entries. The original stays. A transaction can be reversed once. */
  reverse(txId: string, idempotencyKey: string, actor: string, reason: string): { tx: Transaction; replayed: boolean } {
    const orig = this.#txs.find((t) => t.id === txId);
    if (!orig) throw new LedgerError("not_found", `transaction ${txId} not found`);
    if (orig.reverses) {
      throw new LedgerError("already_reversal", "a reversal cannot be reversed; post a new transaction");
    }
    const done = this.#txs.find((t) => t.reverses === txId);
    if (done && done.idempotencyKey !== idempotencyKey) {
      throw new LedgerError("already_reversed", `transaction ${txId} was already reversed`);
    }
    return this.post(
      {
        idempotencyKey,
        description: `Reversal of ${orig.id}: ${reason}`,
        ref: orig.ref,
        lines: orig.lines.map((l) => ({ ...l, direction: l.direction === "debit" ? "credit" : "debit" })),
      },
      actor,
      txId,
    );
  }

  #need(id: string): Account {
    const a = this.#accounts.get(id);
    if (!a) throw new LedgerError("unknown_account", `unknown account ${id}`);
    return a;
  }

  #validate(p: Posting) {
    if (p.lines.length < 2) throw new LedgerError("too_few_lines", "a transaction needs at least two lines");
    let debit = 0n;
    let credit = 0n;
    const currency = p.lines[0]!.amount.currency;
    for (const l of p.lines) {
      if (typeof l.amount.amount !== "bigint") {
        throw new LedgerError("not_integer", "amounts must be bigint minor units");
      }
      if (l.amount.amount <= 0n) {
        throw new LedgerError("non_positive", "line amounts must be positive; use the direction for the sign");
      }
      if (l.amount.currency !== currency) {
        throw new LedgerError("mixed_currency", "all lines of a transaction share one currency");
      }
      if (this.#need(l.accountId).currency !== currency) {
        throw new LedgerError("account_currency", `account ${l.accountId} is not in ${currency}`);
      }
      if (l.direction === "debit") debit += l.amount.amount;
      else credit += l.amount.amount;
    }
    if (debit !== credit) throw new LedgerError("unbalanced", `debits ${debit} != credits ${credit}`);
  }
}

/** A two-line posting: debit one account, credit another, same amount. Wallet payments debit the payer's wallet. */
export const simple = (
  key: string,
  debit: string,
  credit: string,
  amount: Money,
  description: string,
  ref?: string,
): Posting => ({
  idempotencyKey: key,
  description,
  ref,
  lines: [{ accountId: debit, direction: "debit", amount }, { accountId: credit, direction: "credit", amount }],
});
