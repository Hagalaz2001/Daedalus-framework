# Daedalus

The AI-assisted framework for building web, mobile and desktop apps. You steer.

Website and docs: https://hagalaz2001.github.io/Daedalus-framework/

> **AI-assisted framework.** Daedalus is an AI-assisted development framework. AI output can be wrong, insecure or non-compliant. You are responsible for everything you ship; the maintainers, contributors and AI providers are not liable. Packs and checklists are aids, not legal, financial, medical, safety or regulatory advice. See [DISCLAIMER.md](DISCLAIMER.md).

Daedalus is a project generator and framework for products that need a backend, a website, a mobile app or a desktop app, built
from one API contract and one set of design tokens. You choose the stacks; the generator writes a repository with the
architecture, checks, documentation and AI-agent rules already in place.


Who it is for: small teams and solo developers who build several kinds of apps and want the same structure,
checks and workflow in every one, with AI agents as part of the team.

## Quick start

Requirements: [Deno](https://deno.com) 2.9 or newer, Git. Flutter SDK for Flutter apps, Rust for desktop apps.

```
git clone https://github.com/Hagalaz2001/Daedalus-framework.git daedalus
cd daedalus
deno install -g -A -n daedalus cli.ts      # optional: puts `daedalus` on your PATH
daedalus new ../shop --name "Acme Shop" --id com.example.shop \
  --web site,spa --mobile flutter --backend hono
```

Flags that are missing are asked for interactively; `--yes` accepts defaults instead. Without the optional install
step, use `deno run -A cli.ts new ...`. Other commands: `daedalus add-app|add-module|add-pack|studio`, run in a generated
project (the same as the `deno task` equivalents below).

| Flag | Values | Default |
|---|---|---|
| `--web` | `spa`, `spa-vue`, `site`, `site-next`, `none`; combinable with commas | `none` |
| `--islands` | `react`, `vue`: UI framework for interactive parts of the Astro site (only `site` is affected) | `react` |
| `--mobile` | `flutter`, `rn`, `none` | `none` |
| `--desktop` | `gpui`, `tauri`, `none` | `none` |
| `--backend` | `hono`, `none` | `hono` |
| `--db` | `postgres`, `mongodb` (needs the backend). Modules that need Postgres are refused with `mongodb` (exit 2). | `postgres` |
| `--modules` | comma-separated module names from `modules/` (see `template/docs/MODULES.md`) | none |
| `--packs` | comma-separated domain packs from `packs/` ([packs/README.md](packs/README.md)) | none |
| `--ui` | `clean`, `editorial` (token preset) | `clean` |
| `--id` | reverse-domain bundle id, required for mobile apps you will publish | `com.example.<app>` |
| `--git-name`, `--git-email`, `--remote` | set the repository identity and remote, then make the first commit | not set |

The generator copies `template/`, composes the chosen stacks into `apps/`, merges workspace members and tasks into
`deno.json`, replaces placeholders (name, bundle id), runs `deno install`, `deno task sync` and `deno task check`, and
runs `git init`. It does not commit unless you pass `--git-name` and `--git-email`; ask which identity and remote
the project uses before the first commit.

## Choosing a stack

| Need | Pick | Because |
|---|---|---|
| A logged-in product UI (dashboard, admin, tool), team knows React | `spa` | React + Vite single-page app; deploys as static files |
| The same, team knows Vue | `spa-vue` | Vue + Vite single-page app |
| Pages that must rank in search or share well (marketing, blog, docs, shop front) | `site` (default site) | Astro: static HTML output, interactive parts as islands (`--islands react` or `vue`); no live server to attack or scale |
| A site that needs server features (server-side rendering per request, server functions, auth-aware pages) | `site-next` | Next.js, opt-in; adds a running server and its attack surface |
| Both a public site and an app | `site,spa` | Separate apps sharing the API client and tokens |
| Mobile app, team knows Dart or wants one rendering engine and pixel-identical UI | `mobile-flutter` | Flutter + Riverpod; generated Dart client |
| Mobile app, team knows TypeScript or wants to share types with web and backend | `mobile-rn` | React Native with Expo; shares `packages/api_ts` |
| Native-feeling desktop app, small binary, no web runtime | `desktop-gpui` | Rust + GPUI |
| Desktop app that reuses the React UI kit | `desktop-tauri` | Rust shell + webview with the web UI |

Astro is the default website because its output is static files: nothing runs on the server, so there is no server
attack surface and hosting is a CDN. Choose Next.js only when you need rendering or logic per request.

Desktop is Rust: GPUI or Tauri. Not Electron, and no Node runtime in a desktop app. Mobile never uses Flutter web.
You can add apps later with `deno task add-app <stack> <name>`, including a second app of the same stack.

## What you get

```
<project>/
  contracts/openapi.yaml    the API
  design/tokens.json        colours, radii, spacing, fonts
  backend/                  Hono + Drizzle + PostgreSQL + Better Auth (optional)
  apps/<name>/              one folder per chosen stack
  packages/                 api_ts (generated client), stack packages (app_core, ui)
  scripts/                  sync, check, lint-boundaries, lint-deno-only, Daedalus bridge
  docs/                     architecture, AI workflow, ADRs, QA log, reports
  .blueprint.json           which stacks the project uses
  AGENTS.md CLAUDE.md GEMINI.md DESIGN.md PLAN.md CONTRIBUTING.md
```

Repository map of Daedalus:

| Path | Purpose |
|---|---|
| `cli.ts`, `new-project.ts`, `lib/` | The `daedalus` command, the generator and its tests |
| `modules/`, `packs/`, `studio/` | Optional feature modules, domain packs and the design studio |
| `template/` | Base copied into every project |
| `stacks/<id>/` | One folder per stack with `stack.json` and a README |
| `tools/oss-check.ts` | Publishing gate (`deno task oss:check`) |
| `portfolio.mjs`, `autopilot.mjs`, `report.mjs`, `plan-status.mjs` | Optional helpers for running several generated projects |
| `CATALOG.md` | Vetted open-source projects to reach for before building something |

## Daily loop in a generated project

```
deno task sync          # after editing contracts/openapi.yaml or design/tokens.json
deno task dev:backend   # plus deno task dev:web, dev:mobile ... for the apps you have
deno task check         # before every commit and in CI
```

Change an API in this order: contract, `sync`, backend with a test, then each app's data layer, state and UI.
`docs/ARCHITECTURE.md` explains the layers; `AGENTS.md` is the short version for AI agents.

## Commands (in a generated project)

| Command | What it does |
|---|---|
| `deno task sync` | Generate the TypeScript client, each stack's own client, and each app's theme from the tokens |
| `deno task check` | Sync, boundary lint, Deno-only lint, `deno audit`, backend and package checks, then every app's analyze, typecheck, lint, tests, build |
| `deno task check <folder>` | Same for one app or package |
| `deno task lint:boundaries` | A feature may import another feature only through its public entry |
| `deno task lint:deno-only` | No npm, pnpm or yarn files or commands |
| `deno task add-app <stack> <name>` | Add another app of any stack |
| `deno task add-module <name>` | Apply an optional feature module |
| `deno task add-pack <name>` | Apply a domain pack |
| `deno task studio` | Run the design studio from the Daedalus checkout against this project (local models: [docs/LOCAL-AI.md](docs/LOCAL-AI.md)) |
| `deno task doctor` | Check this machine: toolchains and local AI; exit 1 below the minimum |
| `deno task secrets` | Scan for secrets (also the pre-commit hook) |
| `deno audit` | Fail on known vulnerabilities in dependencies (part of `deno task check`) |
| `deno task git:setup` | Set repository identity, hooks and remote |
| `deno task timeline` | Gantt chart from `PLAN.md` |

In this repository: `deno task test` (generator and script tests), `deno task oss:check` (publishing gate),
`deno task check` (both, plus `deno audit`).

`add-app`, `add-module` and `studio` find the Daedalus checkout through `--daedalus <dir>`, `$DAEDALUS_HOME`, a
`daedalus` or `daedalus-framework` folder next to or above the project, or `~/daedalus`.

## Modules and packs

Modules (`modules/<name>/module.json`) and packs (`packs/<name>/pack.json`) are overlays applied after the stacks, by
`--modules` and `--packs` or later by `deno task add-module` and `deno task add-pack`. The generator reads these
keys, all optional: `files` (folder copied into the project, default `files/`; it never overwrites an existing
file), `tasks`, `workspace`, `install`, `sync`, `check`, and `requires` (`backend`, `stacks`). Applied overlays and
their commands are recorded in `.blueprint.json` under `extras`, so `deno task sync` and `deno task check` run them.

## Stack manifest

Each `stacks/<id>/stack.json` describes one stack:

| Field | Meaning |
|---|---|
| `id`, `kind` | Stack id and `web`, `mobile`, `desktop` (or `shared` for folders other stacks copy from) |
| `defaultAppDir` | Where the app goes, `apps/<name>` |
| `appSource` | Folder inside the stack copied to the app dir; default `app` |
| `workspaceMember` | Add the app to the root `deno.json` workspace (TypeScript apps) |
| `packages` | `packages/api_ts` (base), `stack:<path>` (from this stack), `shared:<stack>/<path>` (from another folder) |
| `tasks` | Tasks merged into the root `deno.json`; `{appDir}` and `{appName}` are replaced |
| `replace`, `placeholders`, `move` | Text replacements and directory moves applying name, bundle id and display name |
| `install`, `sync` | Commands run after copying, and during `deno task sync` |
| `tokens` | Script (copied to `scripts/tokens/`) or a command that writes the app's theme from `design/tokens.json` |
| `check` | Commands `deno task check` runs for the app |
| `audit` | `{ "ignore": ["GHSA-..."], "reason": "..." }`: advisories `deno audit` may report for this stack (dev-only tooling); the reason is required and printed on every check. There is no global ignore list. |
| `boundaries` | `{ "lang": "ts" or "dart", "src": "<folder>" }` for `lint:boundaries` |
| `requires` | `{ "backend": "optional" }` |

Commands are strings or `{ "cwd": "...", "run": "..." }`; they run from the project root.

## Deno only

Every JavaScript or TypeScript part, in this repository and in generated projects, uses Deno: `deno.json`
workspaces, `deno.lock`, `deno install`, `deno task`, `deno test`. The 24-hour minimum dependency age stays on.
There are no npm, pnpm or yarn lockfiles or commands. `npm:` specifiers in Deno imports and dependency lists in
`package.json` (which Deno reads) are allowed. `deno task lint:deno-only` and `deno task oss:check` enforce this, and
AGENTS.md tells agents not to reach for npm.

## Security gate and version pinning

`deno task check` runs `deno audit` and fails on known vulnerabilities, in generated projects, in this repository and in
CI. Frameworks are pinned to exact versions, with no `^`, `~` or range: `next`, `astro`, `react`, `react-dom`, `vue`,
`hono` and `better-auth`. `deno task lint:deno-only` fails on a range for these in any `package.json`. It also fails when two manifests in the project pin different versions of the same framework (for example `better-auth` in the web app and in the backend). Upgrade them
deliberately: change the version, run `deno task check`, read the changelog. Deno's 24-hour minimum dependency age
stays on. Flutter and Rust use their own tools, called from `deno task`.

## AI-assisted development

AI agents are a normal part of the workflow here, on top of ordinary engineering: a person sets intent and reviews,
agents plan, implement and test, and the same checks gate both. `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` carry the
rules; `.claude/` has project skills and agents (add-feature, plan-project, design-reviewer ...); `deno task studio`
drafts design directions and screens from the project's UI kit. How to brief an agent, what stays non-negotiable and
a checklist against low-quality output: [`template/docs/AI-WORKFLOW.md`](template/docs/AI-WORKFLOW.md).

Design skills from other authors are not bundled (their licences differ). `template/.agents/README.md` lists the
design rules that apply either way and how to install the skills named in `skills-lock.json`.

## Documentation

For AI tools: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) (MCP server `daedalus mcp`, configuration for Claude Code, Codex,
Gemini CLI, Cursor, Kimi CLI and ACP clients) and [docs/CLI.md](docs/CLI.md) (`--json` output, exit codes).

All in `template/docs/` (copied into each project):
[ARCHITECTURE](template/docs/ARCHITECTURE.md), [AI-WORKFLOW](template/docs/AI-WORKFLOW.md),
[ADRs](template/docs/adr/0001-architecture-baseline.md), DATABASE, MODULES, OPERATIONS and `diagrams/` (maintained
with the backend and modules), and the stack READMEs in `stacks/<id>/README.md`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Refusing to overwrite` | The target folder exists. Pick a new folder. |
| `Unknown or unfinished stack` | `stacks/<id>/stack.json` is missing; the stack is not available in this checkout. |
| `deno audit` fails | A dependency has a known vulnerability. Upgrade it (`deno audit --fix` can try), or record the reasoning and pass `--ignore=<CVE>`. |
| `deno install` fails on a version that does not exist yet | Deno's minimum dependency age rejects packages published in the last 24 hours; pin an older version. |
| Stale type errors after switching branches | Delete `node_modules` and run `deno install`. |
| `flutter` or `cargo` not found in `deno task check` | Install the toolchain of the stacks listed in `.blueprint.json` and open a new terminal. |
| `Daedalus checkout not found` from `add-app` | Pass `--daedalus <dir>` or set `DAEDALUS_HOME`. |
| `lint:boundaries` fails | Import the feature through its `index` (TypeScript) or `<name>.dart` barrel, or move shared code to `shared/` or `core/`. |

## Credits and licence

MIT, see [LICENSE](LICENSE). Third-party code, assets and the projects this builds on (shadcn/ui, Radix UI, Lucide,
React Native Reusables, NativeWind, Forui, gpui-component and others) are listed with their licences in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md); conduct:
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); security reports: [SECURITY.md](SECURITY.md).
