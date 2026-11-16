@AGENTS.md

Read `docs/RESPONSIBLE-AI.md`. A human owns every change; never deploy, move money, delete data, change auth or touch production secrets unattended.

## Claude Code specifics

- Start from `PLAN.md`. "Continue" runs `next-milestone`; a fresh project runs `plan-project`; a one-off feature or
  endpoint runs `add-feature`.
- Before UI or copy work, read `DESIGN.md` and `.agents/README.md`.
- Keep AGENTS.md and DESIGN.md current: when you learn something about this project that the code does not show
  (a decision, a trap, a production fact), add it in the same change.
