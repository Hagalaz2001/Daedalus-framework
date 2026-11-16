@AGENTS.md

Read `docs/RESPONSIBLE-AI.md`. A human owns every change; never deploy, move money, delete data, change auth or touch production secrets unattended.

## Gemini specifics

- Follow AGENTS.md exactly; `docs/ARCHITECTURE.md` holds the module boundaries that `deno task check` enforces.
- Use `deno task add-app` to create apps and `deno task sync` after editing the contract or the tokens.
