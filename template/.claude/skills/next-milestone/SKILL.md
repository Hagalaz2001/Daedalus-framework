---
name: next-milestone
description: Continue this project from PLAN.md - build the first unchecked milestone end to end with the backend, web and mobile agents in parallel, review the design, check, tick it off and commit. Use when the user says "continue", "next milestone", "keep going", "work on this project", or starts a session without a specific request.
---

# Build the next milestone

PLAN.md is the source of progress. One milestone at a time, finished properly, then the next.

1. **Orient (read only).** Read PLAN.md, AGENTS.md "This project", DESIGN.md and `git log --oneline -10`.
   Find the first milestone with an unchecked item. If PLAN.md is still the template, stop and run the
   `plan-project` skill first.
2. **Shape.** For that milestone, write down in a few lines: endpoints, screens, states (loading,
   empty, error, success), and what web vs mobile show. Respect "Decisions" in PLAN.md.
3. **Contract and tokens (you, before any parallel work).** Update `contracts/openapi.yaml` (and
   `design/tokens.json` + DESIGN.md if the look changes), run `deno task sync`.
4. **Build in parallel.** Spawn `backend-dev`, `web-dev` and `mobile-dev` **in one message**, each
   briefed with the milestone, the shape from step 2 and its own folder. They work at the same time
   and cannot collide (one folder each).
5. **Review.** Spawn `design-reviewer` with the screenshots the builders reported. Fix every
   high-severity finding (re-brief the owning builder).
6. **Verify.** `deno task check` must end with "All checks passed". Look at the final screenshots yourself.
7. **Record.** Tick the milestone's items in PLAN.md and append under "Status" exactly:
   `- YYYY-MM-DD M<n> done (planned YYYY-MM-DD) — verified: … — not verified: …` (today's date; the
   planned date is the milestone's end date). Add the milestone's user-visible changes under
   "Unreleased" in CHANGELOG.md, run `deno task timeline`, and commit per the `git-workflow` skill
   (`feat: M<n> <name> — …`). Do not push unless the maintainer said pushing is wanted.
   Log every bug found during the milestone in `docs/QA.md`, then write the stakeholder-facing entry with
   the `business-update` skill (`docs/REPORT.md`) and include both in the commit.
   If this was the **last** milestone: cut release `v1.0.0` (git-workflow "Releases", local tag
   only) and run the `project-deck` skill.
8. **Continue or report.** If the user asked to keep going, start the next milestone. Otherwise
   report: what shipped, screenshots, what is next.

## Autonomous mode (the prompt says no one is watching, e.g. the autopilot)

- **Wait for your agents.** This session ends the moment you reply, and anything still running stops
  with it. Spawn the builders in parallel **in the foreground** (several Agent calls in one message,
  not background), and never end your turn while an agent is still working.
- **Save progress in slices.** When an item of the milestone is done and `deno task check` passes, tick it
  in PLAN.md and commit (`feat(M<n>): <item>`). A session that stops early then loses nothing, and the
  next session continues from the first unticked item.
- **Never stop to ask.** Make the sensible choice, write it under PLAN.md "Decisions", continue.
- **Exactly one milestone per session**, then commit and stop: the next session starts fresh from PLAN.md.
- **Prove the main journey.** Each milestone adds or extends a test of its main user journey: backend
  route tests on the in-memory Postgres, a widget test per new screen, and for web either a component
  test or a Playwright screenshot pass at 390px and 1280px. Screenshots go in `docs/screens/<milestone>/`.
- **Stay inside the project folder**; no global installs, no pushing, no deploys.
- **Time box:** if a single problem has eaten ~20 minutes, take the simpler route that still meets
  the milestone, and note the trade-off under "Decisions".

If something blocks a milestone (a decision only the maintainer can make, missing assets, a failing
check you cannot fix), write it under the milestone as `- [ ] BLOCKED: …`, report it, and stop
rather than guessing.
