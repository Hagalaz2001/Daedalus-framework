# FAQ

## Do I need to know how to code?

You can follow the [first app tutorial](first-app.md) without it. To ship something real you or a teammate must be able
to read a change and judge it; the AI writes quickly but can be wrong. Daedalus is designed so that checks catch many
mistakes, not all of them.

## Which AI assistant should I use?

Any tool that reads `AGENTS.md`: Claude Code, Codex, Gemini CLI, Cursor and others. The project also has `CLAUDE.md` and
`GEMINI.md` for tools that look for those names. Local models work too: see `docs/LOCAL-AI.md`.

## Why Deno and not Node or npm?

One tool for running, testing, installing and locking dependencies, with secure defaults and a 24 hour minimum age on
new packages. Daedalus refuses npm, pnpm and yarn files (`deno task lint:deno-only`). Packages from npm are still usable
through `npm:` imports.

## Do I have to use every part?

No. `--web spa --backend none` gives you a front end only. Modules and packs are opt-in. The base stays small.

## Can I add a mobile app or a website later?

Yes: `deno task add-app <stack> <name>`, for example `deno task add-app web-site-astro site`. Run the commands from the
project folder. See the [cheatsheet](../dev/cheatsheet.md).

## What is the difference between a module and a pack?

A **module** adds one backend feature (email, payments, roles). A **pack** adds a whole capability or domain: files,
commands, checks and rules for AI agents (AI delivery kit, fintech, healthcare). Both never overwrite your existing files.

## Why does `deno task check` take so long the first time?

It installs dependencies and builds every app. Later runs reuse the cache. Check one app with
`deno task check <folder>`, for example `deno task check web`.

## Where does my data live while I develop?

The backend uses a local PGlite database in `backend/.data/` by default, so you need no database server. Production uses
PostgreSQL; see `docs/DATABASE.md` and `docs/OPERATIONS.md` in your project.

## Is it safe to let an AI run commands?

Daedalus helps, it does not guarantee. The ai-kit pack installs a guard that blocks common dangerous commands (deploys,
deleting outside the project, force-push, reading `.env`), and the rules forbid unattended deploys. Still set your
assistant's permission mode conservatively and review what it does. Read `docs/RESPONSIBLE-AI.md`.

## Who is responsible for what I ship?

You are. See [DISCLAIMER.md](../../DISCLAIMER.md).

## Does it cost anything?

Daedalus is MIT licensed and free. Your AI provider, hosting and app store accounts have their own costs.

## Can I change the look?

Yes, in three levels: edit `design/tokens.json` and run `deno task sync`; start from a preset with `--ui clean`,
`editorial` or `playful`; or use `deno task studio` to explore directions. Follow `DESIGN.md`.

## How do I update to a newer Daedalus?

Generated projects are plain folders and are not tied to the framework. Pull the new Daedalus checkout, read its
`CHANGELOG.md`, and apply what you want by hand or with `add-module` and `add-pack`, which never overwrite existing files.

## Where do I get help?

Search the docs: `daedalus docs "your question" --json`. Then [troubleshooting](troubleshooting.md), then open an issue on
GitHub.
