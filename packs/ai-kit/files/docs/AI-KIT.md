# AI delivery kit

What is installed and how to use it. Rules for humans and agents: `docs/RESPONSIBLE-AI.md`.

| Need                          | Command or file                                                                | Notes                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec before code              | `deno task spec:new <slug>`, `spec:plan <id>`, `spec:tasks <id>`, `spec:check` | `specs/`, skills `spec-new`, `spec-implement`; Gemini commands in `.gemini/commands/`                                                           |
| Block dangerous agent actions | `.claude/settings.json` runs `scripts/ai/guard.ts` before tool calls           | Deletes outside the project, force push, `reset --hard`, deploy/publish commands, `.env` access, destructive SQL, piping downloads into a shell |
| Approve one blocked category  | start the agent with `AI_GUARD_APPROVE=deploy` (comma list)                    | Categories: delete, git, deploy, secrets, sql, guard-edit. Comes from your shell, not from the agent                                            |
| Secrets                       | `deno task secrets` (every tracked file), gitleaks with `.gitleaks.toml`       | gitleaks is MIT, an external binary: `gitleaks git --redact -v`                                                                                 |
| Dependencies and licences     | `deno task audit`                                                              | Runs `deno audit` plus a licence check of `node_modules`; exceptions in `.audit-allow.json`                                                     |
| SBOM                          | `deno task sbom`                                                               | Needs syft (Apache-2.0, external) installed                                                                                                     |
| SAST                          | `deno task sast [folder]`                                                      | A small own rule set for typical AI mistakes. Add Semgrep or CodeQL in CI for depth (see below)                                                 |
| Review AI output              | skill `ai-review`, PR template                                                 | AI-assisted and human reviewer fields                                                                                                           |
| Roles                         | `docs/ROLE-PLAYBOOKS.md`, `.claude/agents/`                                    | Delegate, review, prompts per role                                                                                                              |
| Metrics                       | `docs/DELIVERY-METRICS.md`                                                     | DORA, change failure rate                                                                                                                       |

## Limits (read these)

- The guard matches command strings. It stops common accidents, not a determined or obfuscated command. Keep your
  agent's permission mode conservative and run agents in a container or worktree for risky work.
- `deno task sast` has a handful of regex rules, so expect misses and a few false positives (silence a reviewed line
  with `sast:allow <rule-id>`). The Semgrep engine is LGPL-2.1, but its registry rules carry a licence that restricts
  redistribution, so this repository ships none; write your own rules or use CodeQL (free for public repositories).
- `deno audit` only knows published advisories. The licence check reads `package.json` fields, which can be wrong.
- Nothing here is a compliance control by itself. See `DISCLAIMER.md`.

## Credits

Spec templates follow the approach of GitHub Spec Kit (MIT, https://github.com/github/spec-kit) and OpenSpec (MIT,
https://github.com/Fission-AI/OpenSpec); text and code here are original. gitleaks (MIT) and syft (Apache-2.0) are
optional external tools and are not bundled.
