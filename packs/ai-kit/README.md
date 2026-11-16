# ai-kit pack (status: full, on by default)

The AI delivery kit: the part of the blueprint that makes AI-assisted work faster without making it reckless. Everything
it installs is described in `docs/AI-KIT.md` inside the generated project (`files/docs/AI-KIT.md`).

| Area                    | Files                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Spec-driven development | `specs/` templates and constitution, `scripts/ai/spec.ts`, skills `spec-new`, `spec-implement`, Gemini commands in `.gemini/commands/` |
| Agent guardrails        | `.claude/settings.json` hook, `scripts/ai/guard.ts`                                                                                    |
| Checks                  | `scripts/ai/sast.ts`, `audit.ts`, `sbom.ts` (`.gitleaks.toml` ships in the base template)                                                                        |
| Review and roles        | skill `ai-review`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/ROLE-PLAYBOOKS.md`, eight role agents                                     |
| Metrics                 | `docs/DELIVERY-METRICS.md`                                                                                                             |

Tests (in place and in generated projects): `deno test -A scripts/ai/` covers the guard (blocked and allowed commands),
the spec helper, the SAST rules and the licence audit.

Design decisions: Spec Kit and OpenSpec (both MIT) inspired the workflow; their CLIs are not needed, so the templates
and the helper are original and dependency-free. Semgrep rules are not redistributable, so SAST is a small own rule set
plus a recommendation to add CodeQL or Semgrep in CI. gitleaks (MIT) and syft (Apache-2.0) stay external binaries.

If a project already has `.claude/settings.json`, the overlay refuses to overwrite it: merge the `hooks` and
`permissions` blocks by hand.
