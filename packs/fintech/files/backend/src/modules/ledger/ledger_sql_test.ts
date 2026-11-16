// deno-lint-ignore-file no-import-prefix
// Runs ledger.sql in a real PostgreSQL (PGlite, in process) and proves the database enforces the rules itself.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { PGlite } from "npm:@electric-sql/pglite@0.5.15";

const schema = await Deno.readTextFile(new URL("./ledger.sql", import.meta.url));

async function db() {
  const pg = new PGlite();
  await pg.exec(schema);
  await pg.exec(
    `insert into ledger_accounts (id, currency, normal) values ('bank','USD','debit'),('alice','USD','credit'),('eur','EUR','debit')`,
  );
  return pg;
}
const fails = async (p: Promise<unknown>, text: string) => {
  try {
    await p;
  } catch (e) {
    assert(String((e as Error).message).includes(text), `expected "${text}", got "${(e as Error).message}"`);
    return;
  }
  throw new Error(`expected failure containing "${text}"`);
};
const tx = (key: string) =>
  `insert into ledger_transactions (idempotency_key, content_hash, description) values ('${key}','h','d') returning id`;

Deno.test("database: balanced transaction commits, unbalanced does not", async () => {
  const pg = await db();
  await pg.transaction(async (t) => {
    const { rows } = await t.query<{ id: string }>(tx("key-00001"));
    await t.query(
      `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values
      ($1,'bank','debit',500,'USD'),($1,'alice','credit',500,'USD')`,
      [rows[0]!.id],
    );
  });
  const bal = await pg.query<{ account_id: string; signed_minor: string }>(
    `select * from ledger_balances order by account_id`,
  );
  assertEquals(bal.rows.map((r) => [r.account_id, String(r.signed_minor)]), [["alice", "-500"], ["bank", "500"]]);

  await fails(
    pg.transaction(async (t) => {
      const { rows } = await t.query<{ id: string }>(tx("key-00002"));
      await t.query(
        `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values
        ($1,'bank','debit',500,'USD'),($1,'alice','credit',499,'USD')`,
        [rows[0]!.id],
      );
    }),
    "not balanced",
  );
  await fails(
    pg.transaction(async (t) => {
      const { rows } = await t.query<{ id: string }>(tx("key-00003"));
      await t.query(
        `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values ($1,'bank','debit',5,'USD')`,
        [rows[0]!.id],
      );
    }),
    "at least two",
  );
  await fails(
    pg.transaction(async (t) => {
      const { rows } = await t.query<{ id: string }>(tx("key-00004"));
      await t.query(
        `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values
        ($1,'bank','debit',5,'USD'),($1,'eur','credit',5,'EUR')`,
        [rows[0]!.id],
      );
    }),
    "mixes currencies",
  );
  assertEquals(
    (await pg.query(`select 1 from ledger_transactions`)).rows.length,
    1,
    "failed transactions leave nothing",
  );
});

Deno.test("database: no zero or negative amounts, unique idempotency key", async () => {
  const pg = await db();
  await pg.exec(
    `insert into ledger_transactions (id, idempotency_key, content_hash, description) values ('00000000-0000-0000-0000-000000000001','key-00001','h','d')`,
  );
  await fails(
    pg.exec(
      `insert into ledger_transactions (idempotency_key, content_hash, description) values ('key-00001','h','d')`,
    ),
    "duplicate key",
  );
  await fails(
    pg.exec(
      `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values ('00000000-0000-0000-0000-000000000001','bank','debit',0,'USD')`,
    ),
    "check constraint",
  );
  await fails(
    pg.exec(
      `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values ('00000000-0000-0000-0000-000000000001','bank','debit',-5,'USD')`,
    ),
    "check constraint",
  );
});

Deno.test("database: ledger and audit rows are append-only", async () => {
  const pg = await db();
  await pg.transaction(async (t) => {
    const { rows } = await t.query<{ id: string }>(tx("key-00001"));
    await t.query(
      `insert into ledger_entries (tx_id, account_id, direction, amount_minor, currency) values
      ($1,'bank','debit',500,'USD'),($1,'alice','credit',500,'USD')`,
      [rows[0]!.id],
    );
  });
  await pg.exec(
    `insert into ledger_audit (actor, action, subject, data, prev_hash, hash) values ('a','x','s','{}','0','1')`,
  );
  for (const table of ["ledger_entries", "ledger_transactions", "ledger_audit"]) {
    await fails(
      pg.exec(
        `update ${table} set ${
          table === "ledger_audit" ? "actor" : table === "ledger_entries" ? "amount_minor" : "description"
        } = ${table === "ledger_entries" ? "1" : "'x'"}`,
      ),
      "append-only",
    );
    await fails(pg.exec(`delete from ${table}`), "append-only");
    await fails(pg.exec(`truncate ${table} cascade`), "append-only");
  }
});
