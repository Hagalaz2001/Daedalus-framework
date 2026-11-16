# Agent rules for this workspace

Read by Claude Code (through CLAUDE.md), Gemini (through GEMINI.md), Codex, Cursor and any agent that
follows AGENTS.md. Product facts go in "This project" at the bottom and in DESIGN.md. Architecture is in
`docs/ARCHITECTURE.md`; how people and agents split the work is in `docs/AI-WORKFLOW.md`. This is AI-assisted work:
the human decides and is responsible (`DISCLAIMER.md`); ask before anything outward-facing or hard to undo.

## Start here every session

Read `docs/RESPONSIBLE-AI.md`. A human owns every change; never deploy, move money, delete data, change auth or touch production secrets unattended.

1. Read `.blueprint.json` (which apps exist and which stack each uses) and `PLAN.md` (what is next).
2. "Continue" means the `next-milestone` skill; a new project with a template PLAN.md starts with `plan-project`.
3. Tick items in PLAN.md only after `deno task check` passes and the screens were looked at.

## How this repository is built

- **One contract, generated clients.** `contracts/openapi.yaml` is the API. `deno task sync` generates the TypeScript
  client (`packages/api_ts`) and each stack's own client (Dart for Flutter). Never hand-edit generated files and never
  write `fetch` calls to the backend by hand.
- **One set of design tokens.** `design/tokens.json` is the visual system. `deno task sync` writes every app's theme
  file. No hard-coded colours, spacing or radii in UI code.
- **Native per platform, shared data.** Web is React + TypeScript, mobile is Flutter or React Native, desktop is Rust
  (GPUI or Tauri). Never Flutter web, never Electron, never a Node runtime in a desktop app. UI code is not shared
  between stacks; the contract and the tokens are.
- **Feature-first modules with enforced boundaries.** `features/<name>/` owns its UI, state, data access and tests.
  A feature imports another feature only through its public entry (`index.ts` in TypeScript, `<name>.dart` in Dart);
  shared code never imports features. `deno task lint:boundaries` enforces it and runs inside `deno task check`.
- **Deno only for JavaScript and TypeScript.** Install with `deno install`, run with `deno task` / `deno run`, test with
  `deno test`; dependencies live in `deno.json` workspaces and `deno.lock`. Never run or write npm, npx, pnpm or yarn
  commands, and never create their lockfiles or workspace files. `npm:` specifiers in Deno imports and dependency
  lists in `package.json` are fine. `deno task lint:deno-only` enforces this. `deno task check` also runs `deno audit`; fix or upgrade a
  vulnerable dependency instead of ignoring it. Pin `next`, `astro`, `react`, `react-dom`, `vue`, `hono` and
  `better-auth` to exact versions (no `^`, `~` or ranges).
- **Every screen has loading, empty and error states, and every feature ships tests.**

Details and the folder tree of each stack: `docs/ARCHITECTURE.md`. Stack conventions, run and test commands:
`apps/<app>/README.md`.

## Commands (repo root)

| What | Command |
|---|---|
| Regenerate clients and theme files | `deno task sync` |
| Everything: sync, boundaries, backend, every app's analyze/typecheck/lint/test/build | `deno task check` |
| One app or package | `deno task check <folder>` (e.g. `deno task check mobile`) |
| Architecture boundaries only | `deno task lint:boundaries` |
| Deno-only rule only | `deno task lint:deno-only` |
| Add another app of any stack | `deno task add-app <stack> <name> [--id com.example.name]` |
| Apply an optional feature module or domain pack | `deno task add-module <name>` / `deno task add-pack <name>` |
| Draft design directions and screens from the UI kit | `deno task studio` |
| Run | `deno task dev:backend` plus the `dev:*` tasks listed in `deno.json` |
| Scan the repo for secrets | `deno task secrets` |
| Version control setup (identity, hooks, remote) | `deno task git:setup --name ... --email ... [--remote ...]` |
| Timeline (Gantt) from PLAN.md | `deno task timeline` |
| Backend container | `docker build -f backend/Dockerfile -t <name> .` (deploying: the `deploy` skill) |

Stack ids for `add-app`: `web-spa`, `web-spa-vue`, `web-site-astro`, `web-site-next`, `mobile-flutter`, `mobile-rn`, `desktop-gpui`, `desktop-tauri`.
Prefer the Daedalus MCP server or CLI (`add_app` / `daedalus add-app`, `add_module`, `add_pack`; see Daedalus `docs/INTEGRATIONS.md`) to extend the project.
Do not create apps by hand-copying folders: the generator also updates `.blueprint.json`, `deno.json` and the
placeholders.

## Changing an API: always in this order

1. Edit `contracts/openapi.yaml`. Every operation gets an `operationId` and one `tags` entry.
2. `deno task sync`.
3. Backend: implement against the generated types from `@app/api`, with a test in `backend/test/`.
4. Each app: a data layer over the generated client, state, then UI with all three states, plus tests.
5. `deno task check` passes, then see it work in the real app (browser, emulator, desktop window).

The `add-feature` skill runs steps 3-4 in parallel with the agents in `.claude/agents/`, each owning one folder,
then `design-reviewer`. Separate features at the same time: one session per feature with `claude --worktree <name>`
(`.worktreeinclude` copies `.env` into each worktree).

## Backend and database

- `createApp(db)` stays importable without listening, so tests call `app.request(...)`. Validate input at the edge
  and return the contract's `Error` shape.
- PostgreSQL through Drizzle. Change `backend/src/db/schema.ts`, then `deno task --cwd backend db:generate` writes a
  migration in `backend/drizzle/` (commit it); migrations apply when the backend starts. `DATABASE_URL` set means
  that Postgres; unset means a local PGlite database in `backend/.data/`. Tests use
  `openDb({ url: "", dataDir: "memory://" })`. Never edit a committed migration; add a new one.
- Accounts: Better Auth in `backend/src/auth.ts`, routes under `/api/auth/*`. Protected routes read
  `c.get("session")` and every query is scoped to the signed-in user. Roles, social sign-in and 2FA are Better Auth
  plugins; add them rather than building your own, then run `deno task --cwd backend db:auth-schema` and
  `db:generate`. Other building blocks: `docs/CATALOG.md`.

## Design quality

The product must not read as generic AI output.

1. Direction before pixels: `DESIGN.md` (audience, tone, palette reasoning) and `design/tokens.json` decide the
   look. If DESIGN.md is still the template, ask the user; do not invent a direction silently.
2. Follow the design rules in `.agents/README.md` (installed skills if present, otherwise the checklist there).
3. Look at the result: web in a browser at 390 px and 1280 px, mobile on an emulator, desktop in the window. Fix what
   you see before saying it is done; tests do not catch ugly.
4. Run the `design-reviewer` agent on the screenshots before calling a feature finished.

## Working rules

- Verify before claiming: "done" means `deno task check` passed and the change was seen working. Report failures
  plainly, with output.
- Reuse before building: maintained packages and official samples first (`docs/CATALOG.md`).
- Finish before adding: ship and verify what exists before proposing new features.
- Secrets never enter git or chat. `.env` is ignored; commit `.env.example` with names only.
- Ask before anything outward-facing or hard to undo: deploys, store uploads, pushing, deleting data, sending
  messages, paid API spend.
- Bugs go in `docs/QA.md` described by what a user would see; milestone summaries go in `docs/REPORT.md`
  (`business-update` skill). Version control follows the `git-workflow` skill and `CONTRIBUTING.md`.
- LF line endings, English comments and identifiers, small focused diffs, no commented-out code.

## This project

<!-- What the product is, who uses it, the first milestone, anything an agent cannot derive from the code. -->
