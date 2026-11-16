---
name: git-workflow
description: Version control for this project - commits, branches, merge/pull requests, tags, releases, changelog, CI, resolving conflicts and undoing mistakes safely. Use for any git task, before committing or pushing, when opening an MR/PR, cutting a release, or when the user asks about history, branches or conflicts.
---

# Git workflow

## Ground rules

- **Identity is per repository.** Check `git config user.email` before the first commit. If it is
  unset, ask which identity this project uses (work GitLab vs personal GitHub are different
  accounts) and run `deno task git:setup --name … --email … [--remote …]`. Never set a global
  identity and never mix accounts.
- **Never push, force-push, delete branches or tags, or rewrite pushed history without the
  maintainer's explicit go-ahead** for that action. Committing locally is fine.
- **Secrets:** the pre-commit hook (`.githooks/pre-commit`, enabled by git-setup) runs
  `scripts/secret-scan.mjs`. If it refuses, move the value to `.env` and commit the name to
  `.env.example`. Never bypass hooks (`--no-verify`).
- Run `deno task check` before every commit that changes code. Read `git status` before `git add -A`.

## Branches

- `main` is always releasable: `deno task check` passes on it.
- Solo autopilot work commits milestones directly on `main` (one commit per milestone).
- With a team or review: one branch per milestone or feature, `feature/m2-orders`, `fix/<what>`,
  `chore/<what>`, `docs/<what>`; open a merge request (GitLab: `glab mr create`) or pull request
  (GitHub: `gh pr create`) into `main`; squash-merge so the MR title becomes the commit message.
- Parallel sessions on the same repo use worktrees (`claude --worktree <name>`), never two agents in
  one checkout.

## Commit messages (Conventional Commits)

`<type>(<scope>): <what changed, present tense>` — types: `feat`, `fix`, `refactor`, `perf`, `test`,
`docs`, `chore`, `ci`, `build`. Scope is the area (`web`, `mobile`, `backend`, `db`, `contract`).
Milestones: `feat: M2 orders — contract, db, backend, web, mobile`. Body: what and why, not how.

## Releases

1. Update `CHANGELOG.md`: move "Unreleased" items under `## vX.Y.Z — YYYY-MM-DD`.
2. Bump versions where apps show them (web `package.json`, Flutter `pubspec.yaml` `version: X.Y.Z+build`).
3. Commit `chore(release): vX.Y.Z`, then tag `git tag -a vX.Y.Z -m "vX.Y.Z"`.
4. Push the commit and the tag only with the maintainer's go-ahead (`git push origin main --follow-tags`).
Semantic versioning: breaking API change → major, new feature → minor, fix → patch. The
"Testing and handover" milestone ends with `v1.0.0`.

## Conflicts and mistakes

- Conflicts in generated files (`schema.d.ts`, `lib/src/api/**`, `tokens.css`, `tokens.g.dart`):
  take either side, then `deno task sync` regenerates them. In `deno.lock`: take main's, run
  `deno install`. In `backend/drizzle/` migrations: keep both, regenerate a new migration if the
  schema diverged; never edit a migration that is already on `main`.
- Undo the last local commit, keeping changes: `git reset --soft HEAD~1`. Prefer `git revert` for
  anything already pushed. Before anything destructive, `git stash -u` or make a backup branch.
- Use `--no-pager` (or `GIT_PAGER=cat`) for log/diff/show so nothing waits for a terminal.

## CI

`.github/workflows/check.yml` (GitHub) and `.gitlab-ci.yml` (GitLab) run `secret-scan --all` and
`deno task check` on every push to `main` and every MR/PR. A red pipeline blocks merging; fix the cause,
don't disable the job.
