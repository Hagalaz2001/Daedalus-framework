# Driving Daedalus from AI coding tools

Any tool that speaks MCP can create and extend projects through Daedalus. Tools without MCP use the CLI with `--json`
([CLI.md](CLI.md)). In both cases the agent should call Daedalus instead of copying template folders by hand: the
generator also updates `deno.json`, `.blueprint.json`, placeholders and generated files, which hand-copying does not.

## The MCP server

`daedalus mcp` (or `deno run -A <checkout>/mcp.ts`) starts a stdio server. Install the command once:
`deno install -g -A -n daedalus <checkout>/cli.ts`. The server only uses the official MCP TypeScript SDK (MIT).

| Tool | Purpose |
|---|---|
| `list_stacks`, `list_modules`, `list_packs`, `list_presets` | What exists, with id, title and description |
| `describe` (`kind`, `id`) | Manifest and README of one item |
| `new_project` | `dir`, `name`, `id`, `web`, `mobile`, `desktop`, `backend`, `ui`, `islands`, `modules`, `packs`, `skip_check` |
| `add_app`, `add_module`, `add_pack` | Extend an existing project |
| `sync` | Regenerate API clients and theme files |
| `check` | Run `deno task check`; one result per step with `ok`, exit code and output tail |
| `docs_search`, `docs_read` | Search and read Daedalus documentation |

Resources: `daedalus://docs/architecture`, `ai-workflow`, `modules`, `studio`, `cli`, `integrations` (those that exist).

Safety: there is no tool that deploys, pushes, commits, publishes or deletes. `new_project` refuses a folder that exists
and is not empty, and module and pack files never overwrite existing files. `new_project` installs dependencies and
runs checks, so it can take several minutes; set a generous tool timeout or pass `skip_check` and call `check` later.
Results are JSON documents as described in [CLI.md](CLI.md); failures have `isError` set.

## Client configuration

Replace `daedalus` with `deno run -A <checkout>/mcp.ts` if you did not install the command.

**Claude Code**

```
claude mcp add daedalus -- daedalus mcp
```

or a `.mcp.json` in the project: `{ "mcpServers": { "daedalus": { "command": "daedalus", "args": ["mcp"] } } }`.

**Codex CLI** (`~/.codex/config.toml`)

```toml
[mcp_servers.daedalus]
command = "daedalus"
args = ["mcp"]
```

**Gemini CLI** (`~/.gemini/settings.json`)

```json
{ "mcpServers": { "daedalus": { "command": "daedalus", "args": ["mcp"] } } }
```

**Cursor** (`.cursor/mcp.json`)

```json
{ "mcpServers": { "daedalus": { "command": "daedalus", "args": ["mcp"] } } }
```

**Kimi CLI**

```
kimi mcp add --transport stdio daedalus -- daedalus mcp
```

or in `~/.kimi/mcp.json`: `{ "mcpServers": { "daedalus": { "command": "daedalus", "args": ["mcp"] } } }`. Check with
`kimi mcp list` and `kimi mcp test daedalus`.

## ACP clients (Agent Client Protocol)

An ACP client (an editor or another host) runs an agent such as Kimi CLI over ACP and can hand it MCP servers when it
opens a session. The client passes Daedalus in `mcpServers` of the `session/new` request; stdio servers are described
by `name`, `command`, `args` and `env` (a list of `{ name, value }`):

```json
{
  "method": "session/new",
  "params": {
    "cwd": "/path/to/workspace",
    "mcpServers": [
      { "name": "daedalus", "command": "daedalus", "args": ["mcp"], "env": [] }
    ]
  }
}
```

The agent then lists the Daedalus tools like any other MCP tools. Agents that read their own MCP configuration (for
example Kimi CLI's `~/.kimi/mcp.json` above) do not need the client to pass anything. Use whichever the client
supports; do not configure the same server twice.

## CLI with `--json`

For tools without MCP, run `daedalus <command> --json` and parse stdout:

```
daedalus list stacks --json
daedalus new /path/to/shop --yes --web site,spa --mobile flutter --id com.example.shop --backend hono --json
daedalus check /path/to/shop --json
```

Exit codes: 0 success, 1 a step or check failed, 2 invalid input. Read `steps[].tail` for the failing output.

## Rules for agents

The generated `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` tell agents to prefer these interfaces:

- Create projects and apps with `new_project` / `add_app` (or `daedalus new` / `add-app`), never by copying folders.
- Add optional features with `add_module` / `add_pack`.
- Run `sync` after changing the contract or tokens and `check` before declaring work done; report failed steps as they are.
- Ask the human before anything outward-facing: Daedalus has no such tools on purpose.

AI-assisted work stays human-owned: the person decides and is responsible (`DISCLAIMER.md`).
