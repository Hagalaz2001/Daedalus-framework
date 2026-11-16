# Contributing

How changes get into this repository. Humans and AI agents follow the same rules (`docs/AI-WORKFLOW.md`).

## Setup

1. Install Deno 2 (https://deno.com) and the toolchain of the stacks in `.blueprint.json` (Flutter SDK, Rust, ...).
2. `deno install`, then `deno task sync`, then `deno task check`. All three must pass on a clean checkout.
3. `deno task git:setup --name "Your Name" --email you@example.com` sets the identity for this repository only and
   installs the pre-commit secret scan.

## Branches

- `main` is always releasable: `deno task check` passes on it.
- Work on a short-lived branch named `<type>/<short-description>` (`feat/notes-search`, `fix/login-redirect`,
  `docs/architecture`). One branch, one topic.
- Merge by pull request after review and a green CI run. Squash when the branch history is noise, otherwise keep
  the commits.
- Releases are tags `vMAJOR.MINOR.PATCH` on `main`; `CHANGELOG.md` lists what changed.

## Commits

Conventional Commits: `type(scope): imperative summary`, at most 72 characters.

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`.
- Scope is the app or area: `feat(mobile): add note search`, `fix(backend): reject empty titles`.
- Breaking changes: `!` after the scope and a `BREAKING CHANGE:` line in the body.
- The body says why, not what. One logical change per commit; generated files go in the same commit as their source.

## Pull request checklist

- [ ] `deno task check` passes locally (sync, boundaries, tests, builds for every touched app).
- [ ] Contract or token changes were followed by `deno task sync` and the regenerated files are committed.
- [ ] New behaviour has tests; every new screen has loading, empty and error states.
- [ ] UI changes include screenshots (narrow and wide, or the emulator or desktop window) and respect `DESIGN.md`.
- [ ] No feature imports another feature's internals (`deno task lint:boundaries`).
- [ ] No secrets, personal data or machine paths (`deno task secrets`).
- [ ] Docs updated when behaviour, commands or architecture changed; an ADR when a rule changed.
- [ ] AI-assisted parts were read and understood by the author, not just accepted.

## Review

Reviewers check the contract first (is the API right), then boundaries and tests, then the UI against `DESIGN.md`.
Review comments are about the code, not the person. The author resolves every comment or explains why not.

## Reporting bugs

Add a row to `docs/QA.md` describing what a user would see and the impact, then link it from the issue or fix.
