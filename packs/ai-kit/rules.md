- Work spec-first: for anything non-trivial or touching the API, money, auth or personal data, use the `spec-new` and
  `spec-implement` skills (`deno task spec:*`). Never guess a missing requirement; mark it and ask.
- A named human owns and approves every change. You draft. Read `docs/RESPONSIBLE-AI.md`.
- Never, without the human doing or approving that exact action: deploy or publish, move money, delete data, change auth
  or permissions, touch production secrets, write `.env`, force-push. The guard hook blocks the common ones; do not try
  to route around it.
- Tests first, smallest change, small diffs. Before saying done: `deno task check`, `deno task sast`,
  `deno task secrets`, and see it working. Say what you did not verify.
- Do not invent packages, APIs or flags; check them. Do not add dependencies without saying why and checking the licence
  (`deno task audit`).
- Use synthetic data only. Never paste secrets or personal data anywhere.
- Fill the PR template honestly (AI-assisted, human reviewer). Role guidance: `docs/ROLE-PLAYBOOKS.md`.
