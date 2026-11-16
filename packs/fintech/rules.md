- Money is `Money` from `backend/src/modules/ledger/money.ts`: bigint minor units plus a currency. Never `number`
  arithmetic, never floats, never `parseFloat` on amounts. Parse decimal strings with `parseMajor`; split with
  `allocate`.
- Every movement of value is a balanced double-entry posting through `Ledger.post` (or the SQL in `ledger.sql`). Never
  update or delete ledger rows: reverse and repost. Every write API takes an idempotency key.
- Postings above the solo limit go through maker-checker (`approvals.ts`). Never let a user approve their own request.
- Write an audit event for every sensitive action, with an actor. No card numbers, CVV, full account numbers, tokens or
  personal data in logs, errors or tests; use synthetic data.
- KYC, AML and sanctions are interfaces only (`compliance-interfaces.ts`); a human decides on blocks and reports.
- Never call a real payment, bank or exchange API with live credentials, run migrations on shared databases, or deploy.
  Prepare it and hand it to a human.
- The checklists in `docs/compliance/` are aids, not compliance. Say so when you use them.
