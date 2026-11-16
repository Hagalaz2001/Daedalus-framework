---
name: add-feature
description: Add or change a feature end to end in this workspace (contract, backend, web, mobile), with web and Flutter built in parallel to DESIGN.md quality. Use for any new endpoint, new screen backed by the API, or change to an API shape.
---

# Add a feature end to end

A feature is done when web **and** mobile both use it (unless the user said one platform only),
`deno task check` passes, and the screens were looked at and reviewed for design quality.

## 1. Shape it first (you, in the main session)

- For anything with new UI, decide the screens and states before code: read `DESIGN.md` and, for a
  new surface, `.agents/README.md`. If DESIGN.md is still the
  empty template, ask the user about audience and tone, or run the installed design skill
  first. Never invent a visual direction silently.
- Write the plan in a few lines: endpoints, screens, states, what web and mobile each show.

## 2. Contract (you, in the main session; nothing runs in parallel until this is done)

- Edit `contracts/openapi.yaml`: every operation gets an `operationId` (camelCase verb + noun) and
  one `tags` entry (the tag becomes the Dart client, e.g. `notes` → `api.notes`). Shapes go in
  `components/schemas` with `required` listed.
- Design changes (a new color, radius, spacing): edit `design/tokens.json` and DESIGN.md together.
- Run `deno task sync`. If it fails, fix the source; never hand-edit generated files.

## 3. Build in parallel

Spawn these subagents **in one message** so they run at the same time. Each owns one folder, so they
cannot collide:

| Agent | Owns | Brief it with |
|---|---|---|
| `backend-dev` | `backend/` | the operations to implement |
| `web-dev` | the web app folder | the screens, states and the plan from step 1 |
| `mobile-dev` | the mobile app folder | the same screens and states, adapted to iOS/Android conventions |

A shared change to `packages/app_core` (shared widget, theme) is done by you before or after, not by
the agents. For very large features, split further by screen, or give agents worktrees
(`isolation: worktree` in the agent file, or ask for "use worktrees for your agents").

## 4. Review

- Spawn `design-reviewer` with the screenshot paths the builders reported. Fix every high-severity
  finding (re-spawn the owning builder with the findings, or fix directly).
- Run `deno task check`; it must end with "All checks passed".

## 5. Report

Files changed per layer, check summary, screenshots, review findings fixed or left, and what was
verified by looking versus only by tests. If a device or browser check could not run, say so.
