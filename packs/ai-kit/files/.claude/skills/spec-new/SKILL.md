---
name: spec-new
description: Turn a feature idea into a reviewed spec (spec.md plus acceptance.md) before any code. Use for any non-trivial feature or change that touches the API, money, auth or personal data.
---

# Write the spec first

1. Run `deno task spec:new <slug> "<title>"`. It creates `specs/NNN-slug/spec.md` and `acceptance.md` from templates.
2. Read `specs/constitution.md`, `PLAN.md`, `DESIGN.md` and the code the feature touches.
3. Interview the owner, a few questions at a time. Never fill a gap by guessing: write a marker
   `[NEEDS CLARIFICATION: question]` in the spec instead. Ask about users, failure paths, permissions, data and what is
   out of scope.
4. Fill `spec.md` (why, scope, flows, requirements, data and permissions, risks). Describe behaviour, not code.
5. Fill `acceptance.md`: one `- AC-n: Given..., when..., then...` line per observable behaviour, including errors.
6. Run `deno task spec:check`, show the spec to the human and stop. The human sets `Status: approved`. Do not plan or
   code before that.
