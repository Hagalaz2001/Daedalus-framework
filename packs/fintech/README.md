# fintech pack (status: full for the ledger core, checklists are starters)

Building blocks for banking, wallets and payments on the Hono backend. Read `DISCLAIMER.md` first: this is not
financial, legal or compliance advice and no money should move on it before independent review.

| File                       | What it gives you                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money.ts`                 | `Money` = bigint minor units + ISO 4217 currency, exact decimal parsing, largest-remainder `allocate`                                                |
| `ledger.ts`                | Double-entry `Ledger`: balanced entries, one currency per transaction, idempotent `post`, no overdraft flag, reversal instead of edit, trial balance |
| `approvals.ts`             | Maker-checker with a solo limit per currency; the maker never approves their own request                                                             |
| `audit.ts`                 | Append-only, hash-chained audit events and `verifyChain`                                                                                             |
| `reconcile.ts`             | Compare ledger rows with a bank or processor statement: matched, missing either side, wrong amount, duplicates                                       |
| `ledger.sql`               | PostgreSQL schema where the database itself rejects unbalanced, mixed-currency, non-positive, edited or deleted rows                                 |
| `compliance-interfaces.ts` | KYC, sanctions and transaction-monitoring interfaces only                                                                                            |
| `docs/compliance/`         | PCI DSS, SOC 2, ISO 27001 and data-retention checklists                                                                                              |

The TypeScript `Ledger` is in memory: it defines the behaviour and is the test oracle. For production, implement the
same rules over Postgres using `ledger.sql` (drizzle migration from it), post inside one database transaction, and keep
the application role to INSERT and SELECT. HTTP routes are not included: add them contract first with the `add-feature`
skill (every write takes `Idempotency-Key`; the backend already has an idempotency middleware).

Tests: `deno task test:ledger` (balanced entries, idempotency, no float money, immutability, maker-checker,
reconciliation, and the SQL constraints run in an in-process PostgreSQL through PGlite).

Not included, on purpose: card handling, bank connections, KYC providers, interest/fee engines, multi-currency FX,
statements. Each needs your jurisdiction's rules and a licensed provider.
