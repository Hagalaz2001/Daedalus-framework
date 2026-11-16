# Cheatsheet

One page: every command, flag, task and file you will reach for. Full detail: [README](../../README.md),
[CLI reference](../CLI.md).

## The `daedalus` command

Install once: `deno install -g -A -n daedalus cli.ts` (from the checkout). Without it: `deno run -A cli.ts <command>`.

| Command | Does |
|---|---|
| `daedalus new <dir> [flags]` | Create a project |
| `daedalus add-app <stack> <name> [--id ID] [--project DIR]` | Add an app |
| `daedalus add-module <a>[,<b>] [--project DIR]` | Add backend modules |
| `daedalus add-pack <a>[,<b>] [--project DIR]` | Add domain packs |
| `daedalus sync [DIR]`, `daedalus check [DIR]` | `deno task sync` / `check` in a project |
| `daedalus list <stacks\|modules\|packs\|presets> --json` | What exists (prints nothing without `--json`) |
| `daedalus describe <stack\|module\|pack\|preset> <id> --json` | Manifest and README of one item |
| `daedalus docs <query> --json` | Search the docs |
| `daedalus studio [--project DIR]` | Design studio on http://127.0.0.1:4310 |
| `daedalus doctor` | Check toolchains and local AI; exit 1 below the minimum |
| `daedalus mcp` | MCP server on stdio |

Add `--json` to any command except `studio` and `mcp` for one JSON document on stdout. Exit codes: 0 ok, 1 a step failed,
2 invalid input.

### `daedalus new` flags

| Flag | Values | Default |
|---|---|---|
| `--name` | Display name, `"Acme Shop"` | asked |
| `--id` | Reverse-domain bundle id | `com.example.<app>` |
| `--web` | `spa`, `spa-vue`, `site`, `site-next`, `none`; combine: `site,spa` | `none` |
| `--islands` | `react`, `vue` (interactive parts of the Astro site) | `react` |
| `--mobile` | `flutter`, `rn`, `none` | `none` |
| `--desktop` | `gpui`, `tauri`, `none` | `none` |
| `--backend` | `hono`, `none` | `hono` |
| `--db` | `postgres`, `mongodb` | `postgres` |
| `--modules` | e.g. `email,rbac` | none |
| `--packs` | e.g. `ai-kit,fintech` | `ai-kit` is on by default |
| `--ui` | `clean`, `editorial`, `playful` | `clean` |
| `--yes` | Accept defaults, no prompts | ask |
| `--no-check` | Skip the final `deno task check` | run it |
| `--git-name`, `--git-email`, `--remote` | Set identity and remote, then make the first commit | not set |

Stack ids for `add-app`: `web-spa`, `web-spa-vue`, `web-site-astro`, `web-site-next`, `mobile-flutter`, `mobile-rn`,
`desktop-gpui`, `desktop-tauri`. Modules: `admin audit auth-extras email error-tracking flags i18n jobs observability
payments push rbac realtime search storage`. Packs: `ai-kit data-ml eu-compliance fintech game healthcare infra systems`.

`add-app`, `add-module`, `studio` find the checkout through `--daedalus <dir>`, `$DAEDALUS_HOME`, a `daedalus` or
`daedalus-framework` folder next to or above the project, or `~/daedalus`.

## Tasks in a generated project (`deno task <name>`)

| Task | Does |
|---|---|
| `sync` | Generate the TypeScript client, each stack's client and every theme from the contract and tokens |
| `check` | Everything: sync, boundaries, Deno-only, audit, backend, every app, modules, packs |
| `check <folder>` | The same for one app or package, e.g. `check web` |
| `lint:boundaries` | Features import each other only through their public entry |
| `lint:deno-only` | No npm, pnpm, yarn files or commands; frameworks pinned exactly |
| `test:scripts` | Tests of the project's own scripts |
| `dev:backend` | API on http://localhost:8787 (docs at `/docs`) |
| `dev:web`, `dev:mobile`, ... | One per app, from each stack's manifest |
| `build:android`, `build:ios`, `build:mobile-web` | React Native builds |
| `add-app`, `add-module`, `add-pack` | Same as the CLI commands |
| `studio`, `doctor` | Same as the CLI commands |
| `secrets` | Scan every tracked file for secrets |
| `git:setup --name N --email E [--remote URL]` | Identity, hooks, remote |
| `timeline` | Gantt chart from `PLAN.md` |
| `skills:update` | Update the AI skills listed in `skills-lock.json` |

With the `ai-kit` pack (on by default):

| Task | Does |
|---|---|
| `spec:new <slug> [title]` | Create `specs/NNN-slug/{spec.md, acceptance.md}` |
| `spec:plan <id\|slug>` | Create `plan.md` (refuses while `[NEEDS CLARIFICATION]` remains) |
| `spec:tasks <id\|slug>` | Create `tasks.md`, one task pair per acceptance id |
| `spec:check` | Every spec complete, every acceptance id has a task |
| `sast [folder]` | Small rule set for typical AI mistakes |
| `audit` | `deno audit` plus a licence check |
| `sbom` | Software bill of materials (needs `syft`) |

Backend (`deno task --cwd backend <name>`): `dev`, `start`, `test`, `typecheck`, `check`, `seed`, `db:generate --name
<name>`, `db:auth-schema`, `modules:apply <name>`, `diagrams` (ERD).

In the Daedalus repository itself: `deno task test`, `deno task oss:check`, `deno task check`, `deno task new`,
`deno task doctor`, `deno task website:dev`, `deno task website:build`.

## Files and who edits them

| File | You edit it? | Notes |
|---|---|---|
| `contracts/openapi.yaml` | Yes | The API. Every operation needs `operationId` and one tag |
| `design/tokens.json` | Yes | Then `deno task sync` |
| `packages/api_ts/src/schema.d.ts`, `*.g.ts`, `tokens.css` | Never | Generated |
| `AGENTS.md`, `DESIGN.md`, `PLAN.md` | Yes | Rules, look, progress |
| `specs/`, `docs/` | Yes | Specs, ADRs, QA log, reports |
| `.blueprint.json` | Rarely | Which apps and extras the project has; written by the generator |
| `backend/drizzle/` | Via `db:generate` | Committed SQL migrations |
| `deno.json`, `deno.lock` | Via tools | Workspace, tasks, pinned dependencies |

See [anatomy](anatomy.md) for the whole tree and [recipes](recipes.md) for common changes.
