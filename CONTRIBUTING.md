# Contributing to Daedalus

Thank you for helping. This file is about the Daedalus repository itself; the rules for projects it generates are
in `template/CONTRIBUTING.md`.

## Layout you will touch

| Path | What it is |
|---|---|
| `new-project.ts`, `lib/` | The generator and its unit tests |
| `template/` | Base every project gets (contract, tokens, scripts, backend, docs, AI rules) |
| `stacks/<id>/` | One folder per stack, each with `stack.json` and its own README |
| `tools/oss-check.ts` | Publishing gate: private names, personal paths, notices, Deno-only rule |
| `docs` for generated projects | `template/docs/` (architecture, AI workflow, ADRs) |

## Before you open a pull request

1. `deno task check` (unit tests, `deno task oss:check` and `deno audit`).
2. Generate each combination your change can affect into a scratch folder and run `deno task check` in it:
   `deno run -A new-project.ts ../scratch --yes --web spa --mobile flutter --backend hono`.
3. Update the README of the stack, `template/docs/` and `CHANGELOG.md`.
4. Anything copied from another project goes in `THIRD_PARTY_NOTICES.md` with its licence. Only MIT, Apache-2.0, BSD,
   ISC, CC0, CC-BY and OFL material is accepted; no GPL, AGPL, CC-BY-SA, non-commercial or unknown terms.

## Rules

- JavaScript and TypeScript are pure Deno: `deno.json`, `deno.lock`, `deno task`. No npm, pnpm or yarn files or commands.
  `npm:` specifiers inside Deno imports and dependency lists in `package.json` are fine.
- No private project names, personal paths, emails other than `example.com`, or tokens anywhere.
- Commits follow Conventional Commits (see `template/CONTRIBUTING.md`).
- Keep code small and focused; no dead code, no commented-out blocks, no TODO without an issue link.
- Docs state what is true today. Every command in a doc must have been run.

## Adding a stack

Create `stacks/<id>/` with `stack.json` (schema in `lib/blueprint.ts`, field list in the README section "Stack
manifest"), the app sources in `app/`, a README, and a theme script for `design/tokens.json`. Add the flag mapping in
`stacksFromFlags` and a CI matrix entry.
