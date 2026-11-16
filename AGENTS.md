# Agent rules for the Daedalus repository

This file is for AI coding tools working on Daedalus itself. Generated projects have their own rules in
`template/AGENTS.md`. Humans: read [CONTRIBUTING.md](CONTRIBUTING.md).

## Rules

- Toolchain is pure Deno (`deno task`, `deno install`, `deno.lock`). No npm, pnpm, yarn or `node <script>` anywhere.
- Exact version pins. LF line endings. English comments and identifiers.
- No private names, personal paths or emails in the repo: `deno task oss:check` enforces it.
- Do not commit, push, deploy or publish unless the maintainer asks.
- Every new third-party file gets a licence entry in `THIRD_PARTY_NOTICES.md`.

## Where things live

| Thing                                                              | Folder                                             |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| Generator and CLI                                                  | `new-project.ts`, `cli.ts`, `mcp.ts`, `lib/`       |
| What every project gets (contract, backend, scripts, docs, AI rules) | `template/`                                        |
| One folder per stack, described by its `stack.json`                | `stacks/<id>/`                                     |
| Optional backend modules, packs and database flavours              | `modules/`, `packs/`, `dbs/`                       |
| Design studio                                                      | `studio/`                                          |
| Shared scripts (process runner, PLAN.md parser, token core)        | `template/scripts/lib/`, `plan.ts`, `tokens/`      |

Shared logic has one home. Before copying code, look for it there: process execution is `template/scripts/lib/exec.ts`
(use `runArgs` for anything built from user input, never a shell string), stack flags come from each `stack.json`, the
dark palette comes from `template/scripts/tokens/lib.ts`.

## Commands

- `deno task check`: lint, format check, type check, tests, `oss:check`, `deno audit`.
- `deno task test`, `deno task oss:check`.
- `deno task verify:modules` and `deno task verify:dbs`: build a scratch backend with every module / the MongoDB flavour
  and run its own checks (slow; CI runs them).
- A new stack or module is not done until a freshly generated project passes `deno task check`.
