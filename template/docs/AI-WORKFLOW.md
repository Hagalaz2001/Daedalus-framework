# Working with AI agents

AI-assisted development is the default way of working in projects made with Daedalus. It sits on top of
traditional engineering and is meant to shorten the path from intent to a verified change, not to replace the
discipline that keeps a codebase healthy.

**Responsibility.** This is AI-assisted development. The person using it makes every decision and is responsible for
what is built and shipped; the maintainers of Daedalus and the AI tools are not liable. See `DISCLAIMER.md`.

Human in the loop: `docs/RESPONSIBLE-AI.md`. Spec first: `docs/AI-KIT.md` and `specs/`.

## 1. Who does what

| Human | AI agent |
|---|---|
| Sets intent: what, for whom, how it is judged | Proposes a plan against `PLAN.md` and the architecture |
| Decides trade-offs, scope, design direction | Implements, writes tests, regenerates clients |
| Reviews every change before merge | Runs `deno task check`, looks at the running app, reports failures plainly |
| Approves deploys, spending, data deletion, pushes | Stops and asks before any of those |

The agent works from files the repository provides: `AGENTS.md` (rules, also read through `CLAUDE.md` and
`GEMINI.md`), `.blueprint.json` (which apps exist), `docs/ARCHITECTURE.md`, `DESIGN.md`, `PLAN.md` and each app's
README. If an instruction an agent needs is missing from those files, add it there instead of repeating it in chat.

## 2. The loop

1. **Intent.** One feature or fix in a sentence, with the user it serves and how success is observed.
2. **Contract first.** If data changes, edit `contracts/openapi.yaml` and run `deno task sync`.
3. **Plan.** The agent lists the files and layers it will touch (data, state, UI, tests) before writing code.
4. **Implement in parallel where the folders are separate.** The `add-feature` skill starts `backend-dev`, `web-dev`,
   `mobile-dev` agents, each owning one folder. Separate features run in separate sessions with
   `claude --worktree <name>`.
5. **Verify.** `deno task check` passes, then the change is seen working: browser at narrow and wide widths,
   emulator, or desktop window. Screenshots are looked at, not just taken.
6. **Review gate.** `design-reviewer` on the screenshots, a human reads the diff.
7. **Record.** Bugs found go to `docs/QA.md`; a decision that changes a rule goes to `docs/adr/`.

## 3. The review gate

A change is not done until all of these hold:

- `deno task check` is green (this includes boundary lint and every app's tests and builds).
- The UI was looked at and follows `DESIGN.md`; accessibility basics hold (contrast, labels, focus, touch size).
- A human reviewed the diff.
- A human approved anything outward-facing or hard to undo: deploys, store uploads, pushes to shared branches, paid
  API use, data deletion, sending messages.

## 4. What stays non-negotiable

AI speeds up typing and exploration. These do not change:

- Architecture boundaries and the layer order in `docs/ARCHITECTURE.md`.
- Tests for every feature, run in CI.
- Code review by a person who understands the change.
- Version control: small commits, conventional messages, no force-push to shared branches.
- Security: secrets stay out of git and chat, input is validated at the edge, queries are scoped to the signed-in user,
  dependencies are pinned and reviewed.
- Accessibility and the design rules in `.agents/README.md`.

## 5. Briefing an agent well

A good brief is short and checkable:

- **Goal and user:** "Signed-in users can search their notes by title."
- **Scope:** which app folders may change; what must not (for example, no contract change).
- **Done when:** commands and observable behaviour ("`deno task check` passes; search shows an empty state for no
  results; works at 390 px").
- **Constraints:** library or pattern to reuse, files to read first, things to avoid.
- **Unknowns:** say what you do not know; ask the agent to list assumptions before coding.

Prefer one task per session. Give the agent the failing output instead of a description of it. When it goes wrong,
change the instructions files or the brief, then retry; do not argue in a long thread.

## 6. Keeping AI output from turning into slop

Check every AI-written change against this list before merging:

- [ ] Reads like the rest of the codebase: same naming, layering and error handling.
- [ ] No dead code, commented-out blocks, unused exports, or leftover "example" files.
- [ ] No duplicated logic: it reused an existing helper or component instead of writing a near copy.
- [ ] No speculative features, options or abstractions nobody asked for.
- [ ] Errors are handled at the boundary with a typed error; nothing is swallowed.
- [ ] Tests assert behaviour, including failure cases, and would fail if the feature broke.
- [ ] Comments explain why, not what; no filler docs; no unowned TODOs.
- [ ] UI uses tokens and shared components, has all three states, and was looked at in a real runtime.
- [ ] Copy is specific and plain, with no marketing adjectives or filler.
- [ ] Dependencies added are necessary, maintained, licence-compatible and pinned.
- [ ] Every command and path mentioned in docs was run or checked once.

## 7. Setup for agents

- Rules files are in the repository. Skills for design and workflow: `.claude/skills/` (project workflows) and
  `.agents/README.md` (design rules and how to restore third-party skills listed in `skills-lock.json`).
- Parallel work: one folder per agent, one worktree per feature.
- Keep `AGENTS.md` short and current; put detail in `docs/`.
