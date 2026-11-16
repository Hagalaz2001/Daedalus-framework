# Plan

The single source of progress for this project. Agents read it at the start of every session,
work on the **first unchecked milestone**, and tick items only after `deno task check` passes and the
screens were looked at. Keep it short; details live in `docs/`.

## Product

<!-- One paragraph: what it is, who it is for, the one job it must do well. -->

- **Web:** <!-- who uses the website and for what -->
- **Mobile:** <!-- who uses the app and for what -->
- **Done means:** <!-- the observable result that makes this project finished -->
- **Maintainer / team:** <!-- who is responsible; who reviews -->

## Milestones

Each milestone is shippable on its own: contract, database, backend, web and mobile together.
Heading format (read by the timeline and the portfolio board, keep it exact):
`### M<n> — <name> · <planned start YYYY-MM-DD> → <planned end YYYY-MM-DD>`.
Planning rule: building takes 1–2 weeks with AI, then a testing milestone; a project is 2–4 weeks.

### M1 — Foundation · YYYY-MM-DD → YYYY-MM-DD
- [ ] DESIGN.md filled in (audience, tone, palette) and `design/tokens.json` matches it
- [ ] Contract and database: the first real resource replaces the example `notes`
- [ ] Backend, web and mobile implement it; `deno task check` passes
- [ ] Web and mobile screens screenshotted and reviewed by design-reviewer

### M2 — <!-- name --> · YYYY-MM-DD → YYYY-MM-DD
- [ ] <!-- contract / database change -->
- [ ] <!-- web screen(s) -->
- [ ] <!-- mobile screen(s) -->

### M3 — Testing and handover · YYYY-MM-DD → YYYY-MM-DD
- [ ] Main journeys tested end to end on web (390px and 1280px) and on an Android device or emulator
- [ ] Bugs found in testing fixed; `deno task check` passes on a clean clone
- [ ] Release tagged (`v1.0.0`), CHANGELOG.md updated
- [ ] Project deck generated (`docs/deck/`)

## Status

<!-- Agents append one line per finished milestone:
     `- YYYY-MM-DD M<n> done (planned YYYY-MM-DD) — <commit> — verified: … — not verified: …` -->

## Decisions

<!-- Choices the maintainers made that an agent must not reverse (stack, scope, wording). -->
