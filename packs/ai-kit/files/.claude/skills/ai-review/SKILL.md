---
name: ai-review
description: Review AI-written changes (a diff or branch) like a skeptical senior - correctness, security, tests that can fail, invented APIs, licences, scope creep. Use before a human review and before opening a PR.
---

# Review an AI-written diff

Read the diff (`git diff main...HEAD`), check each item, report findings by severity with file and line.

1. Scope: does the diff do exactly what the spec or task says and nothing more? Unrequested features, renamed files,
   deleted tests, weakened lint or type rules.
2. Correctness: edge cases, null and empty, time zones, concurrency, error paths that swallow errors.
3. Invented things: packages, functions, flags or endpoints that do not exist. Check each new import against the
   lockfile and the docs.
4. Tests: would each test fail if the code were wrong? No assertion-free tests, no mocking the thing under test, no
   snapshots updated blindly.
5. Security: input validation at boundaries, authorisation on every route, injection, secrets, personal data in logs;
   run `deno task sast` and `deno task secrets`.
6. Money, auth, data deletion, migrations: needs a human who knows the area; say so.
7. Dependencies and licences: new packages, `deno task audit`.
8. Generated files edited by hand instead of regenerated?

End with: ship, fix first, or needs a human expert, and what you did not verify. You are not the approver; a named human
is.
