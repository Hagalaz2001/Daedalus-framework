# Responsible AI use in this project

This project is built with AI assistance. AI is a fast, fallible junior: it drafts, a human decides. Nothing in the
generated code, docs or checklists is legal, financial, medical, safety or regulatory advice, and nothing is certified.
The authors of Daedalus, its contributors and the AI providers accept no liability for what you ship (see the MIT
`LICENSE`). **You drive. You are responsible, no matter what the AI said.**

## 1. A named human owns every change

- Every pull request names one human owner and one human reviewer (the PR template has the fields). The owner can
  explain every line, whoever or whatever wrote it. "The AI wrote it" is never an answer in review.
- AI-assisted changes say so in the PR (`AI-assisted: yes`, which tool). That is for review focus, not blame.
- The reviewer is not the AI that wrote the change. A second AI pass is a useful extra, never the gate.
- Changes to auth, permissions, money, personal data, crypto, migrations or infrastructure need a reviewer who knows
  that area.

## 2. Review gates (all must be green before merge)

| Gate                              | How                                                                    |
| --------------------------------- | ---------------------------------------------------------------------- |
| Spec exists and is approved       | `specs/<id>/spec.md` for any non-trivial change (`deno task spec:new`) |
| Tests written and meaningful      | A test that cannot fail does not count. Read what it asserts.          |
| `deno task check`                 | Types, lint, boundaries, tests, per stack                              |
| Secrets scan                      | `deno task secrets` (and gitleaks if installed)                        |
| SAST and dependency/licence audit | `deno task sast`, `deno task audit`                                    |
| Human read of the diff            | Including generated and lock files that changed                        |
| Seen working                      | Real browser, emulator, device or window, not only tests               |

## 3. What AI must never do unattended

An agent may prepare these and show the exact command or change. A human runs or approves each one, every time:

- Deploy or release to any shared or production environment.
- Move, create or reverse money; call payment, banking or trading APIs with real credentials.
- Delete or overwrite data (databases, buckets, backups, branches with unmerged work), run destructive migrations.
- Change authentication, authorisation, roles, firewall, CORS or other access rules.
- Read, print, write or rotate production secrets, or write `.env` files.
- Force-push, rewrite shared history, or publish packages.
- Send messages to real users or customers.
- Spend on paid APIs or cloud resources beyond an agreed limit.

The Claude Code hooks (`.claude/settings.json`, `scripts/ai/guard.ts`) block the most common of these. Hooks are a
safety net, not a permission system: configure your agent's own permission mode conservatively too.

## 4. Data you give to AI tools

- Use only tools your organisation approved for the data in question.
- No secrets, tokens, customer data, health or financial records in prompts, logs, screenshots or test fixtures. Use
  synthetic data.
- Know whether your provider trains on your inputs and where it stores them.

## 5. Quality of AI output

- Verify package names, API calls and versions the AI suggests; models invent them. Check licences of added dependencies
  (`deno task audit`).
- Do not accept code you cannot explain. Ask the AI to explain it, then check the explanation against the docs.
- Prefer small diffs. Review capacity is the limit on AI speed: more volume means more failures unless review keeps up.
  Watch change failure rate and time to restore (`docs/DELIVERY-METRICS.md`).
- Regulated domains: packs give checklists, not compliance. Get professional advice and keep humans in every approval
  step (maker-checker, clinical sign-off, safety case).

## 6. Incidents

If AI-written code caused an incident: fix it, write a blameless note in `docs/QA.md`, add the missing test or gate,
and, if the cause was a prompt or rule, change that rule so it does not repeat.
