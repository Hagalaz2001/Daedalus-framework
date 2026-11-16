---
name: business-update
description: Translate what happened in development, debugging, QA and automation into a plain-language update a manager can read - progress against the timeline, what changed for users, bugs in terms of who is affected, risks and decisions needed. Use after every milestone, after a debugging or testing session, when the autopilot finishes a session, or when asked for a status update, progress report or "explain this to a stakeholder".
---

# Business update

Managers do not read code, commits or test logs. Write `docs/REPORT.md` entries that a manager can
read in one minute and act on. Facts only from the sources; never invent progress.

## Sources

`PLAN.md` (milestones, planned vs finished dates, decisions), `docs/QA.md`, `git log --since` the
last REPORT.md entry, `CHANGELOG.md` "Unreleased", the latest `deno task check` result, CI status if a
remote exists, `docs/screens/**`.

## Translate, don't summarise

| Developer fact | Business sentence |
|---|---|
| "fixed race condition in POST /orders" | "Two customers ordering at the same moment could get a double order. Fixed and tested." |
| "added RLS policies on bookings" | "Clinics can now only see their own patients' bookings." |
| "flutter analyze: 0 issues, 34 tests pass" | "All automatic checks pass (34 tests on the phone app)." |
| "refactored repository layer" | Leave it out unless it changes speed, cost or risk; then say that. |
| "M2 slipped 2 days, blocked on Supabase auth config" | "Sign-in is 2 days behind plan; waiting on the Supabase account details from you." |

Rules: no file names, function names, library names or acronyms (say "sign-in", "phone app",
"database"); every bug is described by who is affected and what they would see; every risk ends
with what is being done or what decision is needed; numbers only when they mean something to a
manager (days, users affected, tests passing).

## Entry format (newest first, prepend under the title)

```markdown
## YYYY-MM-DD — <one-line headline, e.g. "Booking works on web and phone; on track">

**Status:** On track | At risk | Late — <M<n> name>, planned finish YYYY-MM-DD (expected YYYY-MM-DD)
**Done since last update:** <2–4 bullets, each something a user can now do or no longer suffers>
**Quality:** <tests passing in plain words>; bugs: <n> found, <n> fixed, <n> open (<n> blocking)
**Risks:** <bullet per risk with its mitigation, or "None">
**Decisions needed from you:** <bullet per decision with the options, or "None">
**Next:** <what comes next and by when>
```

## QA log (`docs/QA.md`)

Every bug found while testing, debugging or by the autopilot gets a row, written for a manager:

`| B<n> | YYYY-MM-DD found | <what a user would see> | Blocks use / Annoying / Cosmetic | Open / Fixed YYYY-MM-DD | <fix in one sentence> |`

Keep fixed rows (they show quality work); never delete a bug to make the numbers look better.
