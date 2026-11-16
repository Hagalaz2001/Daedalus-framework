# CLI reference

The `daedalus` command (`cli.ts`). Install: `deno install -g -A -n daedalus <path to checkout>/cli.ts`, or run
`deno run -A cli.ts ...` from the checkout. Inside a generated project, `deno task add-app`, `add-module`, `add-pack` and
`studio` call the same commands.

## Commands

| Command | Does |
|---|---|
| `daedalus new <dir> [flags]` | Create a project (flags in the README). Refuses a folder that exists and is not empty. |
| `daedalus add-app <stack> <name> [--id ID] [--project DIR]` | Add an app to the project in `DIR` (default: current folder). |
| `daedalus add-module <name>[,<name>] [--project DIR]` | Apply modules. Never overwrites existing files. |
| `daedalus add-pack <name>[,<name>] [--project DIR]` | Apply domain packs. |
| `daedalus sync [DIR]` | `deno task sync` in the project. |
| `daedalus check [DIR]` | `deno task check` in the project. |
| `daedalus list <stacks\|modules\|packs\|presets>` | What is available. |
| `daedalus describe <stack\|module\|pack\|preset> <id>` | Manifest and README of one item. |
| `daedalus docs <query>` | Search Daedalus documentation. |
| `daedalus studio [--project DIR]` | Run the design studio. |
| `daedalus mcp` | MCP server on stdio ([INTEGRATIONS.md](INTEGRATIONS.md)). |

`new`, `add-app`, `add-module` and `add-pack` take `--no-check` to skip the final `deno task check`. `new` takes `--yes`
to accept defaults instead of asking.

## Non-interactive and JSON mode

Add `--json` to any command except `studio` and `mcp`. Then:

- stdout contains exactly one JSON document; progress and prompts-free logs go to stderr;
- nothing is ever asked: missing optional values take their defaults, missing required ones are an error;
- the exit code still reflects success.

Without `--json`, flags that are missing are asked for interactively unless `--yes` is given.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success. For `check`: every step passed. |
| 1 | A step failed (install, sync, a check) or an internal error. The JSON `steps` list says which. |
| 2 | Invalid input: unknown flag value, bad name or bundle id, unknown stack or item, folder not empty, not a Daedalus project. |

## JSON schema

Every document has `ok` (boolean) and `steps` (commands the tool ran, empty for read-only commands).

```
Step     { cmd: string, cwd: string, ok: boolean, exitCode: number, tail?: string }   // tail: last 30 lines of output

Failure  { ok: false, error: { kind: "usage" | "step-failed" | "internal", message: string }, steps: Step[] }

new      { ok: true, command: "new", dir, stacks: string[], apps: { stack, dir }[], backend: boolean,
           modules: string[], packs: string[], ui: string, next: string[], steps }
add-app  { ok: true, command: "add-app", dir, app: { stack, dir }, steps }
add-module / add-pack
         { ok: true, command: "add-module" | "add-pack", dir, applied: string[], steps }
sync     { ok: true, command: "sync", dir, steps }
check    { ok: boolean, command: "check", dir, checks: CheckStep[], steps }
         CheckStep { cwd, cmd, ok, exitCode, tail }   // one per check step: sync, boundaries, deno-only, audit,
                                                      // backend, each app, each module or pack
         ok is false (exit code 1) when any check step failed
list     { ok: true, command: "list", kind, items: { kind, id, title, description }[], steps: [] }
describe { ok: true, command: "describe", item: { kind, id, title, description, manifest, readme? }, steps: [] }
docs     { ok: true, command: "docs", query, results: { path, title, score, snippet }[], steps: [] }
```

Within a generated project, `deno task check --json` prints `{ ok, steps: CheckStep[] }` directly.

The schema is covered by `new-project_test.ts`; additions are backwards compatible, removals are breaking changes.
