---
name: spec-implement
description: Plan and implement an approved spec task by task (plan.md, tasks.md, tests first, small reviewable diffs). Use after a spec is approved.
---

# Plan, tasks, implement

1. Plan: `deno task spec:plan <id>` (refuses while clarifications remain). Fill `plan.md` against
   `docs/ARCHITECTURE.md`: files touched, contract and data changes, test strategy, rollout and rollback. Stop for human
   review.
2. Tasks: `deno task spec:tasks <id>`. Refine; mark independent tasks `[P]` and give each its own folder owner.
3. Per task: write the failing test, make it pass with the smallest change, run `deno task check`, tick the task. Keep
   each diff small enough to review in 15 minutes.
4. Contract changes follow the order in AGENTS.md (contract, `deno task sync`, backend, apps).
5. Finish: `deno task spec:check`, `deno task sast`, `deno task secrets`, see it working in the real app, set the spec
   to `Status: implemented`, fill the PR template (AI-assisted, human reviewer). Never deploy; hand over to a human.
