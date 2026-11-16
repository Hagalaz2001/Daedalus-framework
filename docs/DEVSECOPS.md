# DevSecOps for Daedalus itself

Two separate things share this name:

- **Generated projects** ship a secure delivery pipeline: [`template/docs/DEVSECOPS.md`](../template/docs/DEVSECOPS.md)
  explains it (checks, releases, deploy templates, secrets, threat model, checklists). This page is not about that.
- **This repository** is protected by the workflows below. They follow the same rules, so the framework does not ask
  of users what it does not do itself.

## What protects this repository

| Workflow / file                   | Does                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`        | `deno task check` (unit tests, `oss:check`, `deno audit`), then a freshly generated project per stack combination, each running its own `deno task check` |
| `.github/workflows/security.yml`  | gitleaks on pull requests (and the whole history weekly), CodeQL for TypeScript/JavaScript and for the workflow files |
| `.github/workflows/pages.yml`     | Builds the documentation site and publishes it to GitHub Pages                                     |
| `.github/workflows/deno-patched.yml` | Temporary build of Deno with an upstream fix; tag-triggered only                                |
| `.github/dependabot.yml`          | Weekly grouped updates for pinned actions and the Deno projects, with a 7-day cooldown            |
| `.github/actions/gitleaks`        | Checksum-verified gitleaks install shared by the scan jobs                                         |
| `deno task oss:check`             | Private names, personal paths, emails, third-party notices, Deno-only rule, and **workflow pinning** (`template/scripts/lint-workflows.ts`) |

Rules every workflow here follows, enforced by `oss:check`:

1. Every `uses:` is pinned to a full commit SHA with the version in a trailing comment. Local actions (`./...`) are fine.
2. Every workflow has a top-level `permissions:` block (read-only unless a job needs more, and then that job says why).
3. No `pull_request_target`.
4. Untrusted values (tag names, inputs) reach scripts through `env:`, never pasted into the script text.
5. Checkouts use `persist-credentials: false` unless the job pushes.

Local checks before opening a pull request:

```
deno task check
actionlint .github/workflows/*.yml template/.github/workflows/*.yml   # optional, MIT: https://github.com/rhysd/actionlint
gitleaks dir . --redact                                                 # optional, MIT: https://github.com/gitleaks/gitleaks
```

## Updating an action pin

Dependabot proposes these. By hand: find the release, resolve its commit (an annotated tag needs the `^{}` form), replace
the SHA and the version comment, run `actionlint` and `deno task oss:check`.

```
git ls-remote https://github.com/actions/checkout.git 'refs/tags/v7.0.1' 'refs/tags/v7.0.1^{}'
```

The same pins appear in `template/.github/` (what generated projects get); update both. The gitleaks version and
checksum live in `.github/actions/gitleaks/action.yml` and `template/.github/actions/gitleaks/action.yml`.

## Repository settings the maintainer turns on (Settings on GitHub)

- Branch protection on `main`: pull request required, the `blueprint` and generated-project jobs of `ci` required, no
  force pushes, include administrators
- Secret scanning with push protection, Dependabot alerts and security updates, private vulnerability reporting
  (`SECURITY.md` points to it)
- Actions > General: workflow token read-only by default; pull request approval by Actions off
- Pages source set to "GitHub Actions" (see `pages.yml`)
- Releases: tag `vX.Y.Z` after updating `CHANGELOG.md`

## Tools used (invoked, never vendored)

| Tool                                               | Licence                     |
| -------------------------------------------------- | --------------------------- |
| gitleaks                                           | MIT                         |
| CodeQL action (CLI under GitHub's terms, free for public repositories) | MIT (action) |
| actionlint                                         | MIT                         |
| Trivy, syft, cosign (used in generated projects)   | Apache-2.0                  |
| Dependabot                                         | GitHub service              |

## Known limits

- The `deno-patched.yml` build downloads and compiles upstream sources by tag; it is temporary by design.
- CodeQL does not analyse Dart, so Flutter code is covered by `flutter analyze` only; Rust (GPUI, Tauri stacks) is template
  code that is not compiled in this repository's CI beyond the generated-project matrix.
