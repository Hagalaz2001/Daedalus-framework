# Role playbooks

For each role: what to hand to AI, what a human must still check, and prompts that work. Agent definitions live in
`.claude/agents/` (Claude Code); other tools read the same text. Everything here is guidance, not a guarantee
(`docs/RESPONSIBLE-AI.md`).

General prompt rules that apply to every role:

- Give the goal, the files to read, the constraint and the definition of done. Point at the spec.
- Ask for a plan first on anything bigger than one file; approve it; then implement.
- Ask the agent to say what it did **not** verify. Ask for tests first.
- Keep each task small enough to review fully. One concern per diff.
- Paste real error output, not a description of it.

## Frontend (web)

**Delegate to AI**

- Component and screen scaffolding from DESIGN.md and tokens
- Data hooks over the generated client
- Unit and component tests
- Accessibility fixes from an audit
- Migrations between library versions

**A human must review**

- Real rendering at 390 and 1280 px, keyboard path, focus order
- Loading, empty, error states exist
- No hard-coded colours or spacing
- No hand-written fetch, no dangerouslySetInnerHTML
- Bundle size and new dependencies

**Prompts that work**

- "Build <screen> from DESIGN.md using only token classes and the generated client; list the states you handled."
- "Write tests that fail if the empty state or the error state is removed."

**Limit**: Do not edit contracts or backend. Do not ship UI you have not looked at.

## Backend

**Delegate to AI**

- Route handlers and services against the generated types
- Repository code and migrations drafts
- Integration tests, fixtures with synthetic data
- OpenAPI examples and error cases

**A human must review**

- Authorisation on every route and every row access
- Input validation at the boundary, parameterised queries
- Migrations reversible and safe on big tables
- Idempotency and retries on writes
- Logs free of personal data and secrets
- Money in integer minor units

**Prompts that work**

- "Implement operation <id> from contracts/openapi.yaml with a failing test first; show the authorisation check."
- "List every way this endpoint can be abused by a logged-in user."

**Limit**: Never run migrations against shared databases or touch production secrets.

## Mobile

**Delegate to AI**

- Screens and state from the design kit
- Platform channel boilerplate
- Widget and component tests
- Offline and error handling drafts
- Store metadata drafts

**A human must review**

- Real device or emulator run, not only tests
- Permissions requested only when needed, with rationale text
- Offline, slow network, rotation, text scaling, dark mode
- Secure storage for tokens, no secrets in the bundle
- Store policy fit (privacy labels, data safety, review guidelines)

**Prompts that work**

- "Build <screen> with loading, empty and error states and a widget test for each."
- "What happens on this screen with no network after the first load?"

**Limit**: Never submit builds to stores; a human does.

## Desktop

**Delegate to AI**

- Views and commands over the generated client
- Window, menu and shortcut boilerplate
- Unit tests for state and commands
- Packaging config drafts

**A human must review**

- Runs as a real window on each target OS you support
- Capabilities and IPC allow-lists as small as possible
- No Node runtime, no unnecessary network access, signed updates
- Code signing and notarisation steps owned by a human
- Keyboard and screen reader behaviour

**Prompts that work**

- "Add command <name> with the smallest Tauri capability set; explain each permission."
- "Write a test for the state transitions of <view> without a window."

**Limit**: Never publish installers or auto-update feeds.

## QA and test

**Delegate to AI**

- Test case lists from acceptance criteria
- Unit, integration and end-to-end tests
- Property and boundary tests
- Test data generators (synthetic)
- Bug reports with steps to reproduce

**A human must review**

- Each test fails when the behaviour breaks (mutate the code and see)
- No flaky waits, no order dependence
- Coverage of failure paths, not just the happy path
- Tests assert behaviour, not implementation details
- Fixtures contain no real personal data

**Prompts that work**

- "From specs/<id>/acceptance.md, list the tests per AC and the edge cases the spec missed."
- "Break this function: give 10 inputs likely to fail and why."

**Limit**: Do not change production code to make a test pass; report it.

## DevOps and SRE

**Delegate to AI**

- CI workflow drafts and caching
- Dockerfile and compose hardening
- IaC drafts with `plan` output
- Dashboards, alerts and runbook drafts
- Post-incident timelines from logs you provide

**A human must review**

- Every `apply`/`deploy` is run by a human after reading the plan
- Least privilege, no wildcard IAM, secrets from a store
- Actions pinned to a commit or version, minimal permissions
- Rollback path tested
- Alerts are actionable (symptom, owner, runbook)

**Prompts that work**

- "Write the workflow with minimal permissions and pinned actions; list what each secret is used for."
- "Draft a runbook for <alert>: detect, mitigate, verify, escalate."

**Limit**: Never run apply, deploy, destroy, kubectl changes or rotate production secrets.

## Security

**Delegate to AI**

- Threat model drafts (STRIDE, abuse cases)
- First-pass review of diffs for OWASP Top 10 issues
- Dependency and config review
- Security test ideas
- Prompt-injection review of LLM features

**A human must review**

- Every finding reproduced or reasoned through before you act on it (AI over- and under-reports)
- Authentication and authorisation paths read by a human
- Crypto choices by someone who knows crypto
- Secrets, logging, error messages
- Supply chain: new packages, install scripts, licences

**Prompts that work**

- "Threat-model this feature: assets, actors, entry points, top 10 abuse cases, mitigations."
- "Review this diff only for broken access control and injection; cite line numbers."

**Limit**: Never exploit anything outside the project's own test environment; never write or print secrets.

## Data and ML

**Delegate to AI**

- Pipeline and SQL drafts
- Evaluation datasets and harness code
- Prompt variants and A/B runs
- Notebook cleanup into tested modules
- Data quality checks

**A human must review**

- Numbers checked against a hand-computed sample
- Train/test leakage, label quality, bias across groups
- Every LLM feature has golden cases and a regression threshold
- PII removed or justified, retention stated
- Cost and latency per call measured

**Prompts that work**

- "Write 30 golden cases for <feature> including 10 adversarial ones, as JSONL with expected properties."
- "Find leakage between these train and test splits."

**Limit**: Do not send real personal or customer data to an unapproved model; do not train on data without a legal
basis.

## Product management

**Delegate to AI**

- Spec and acceptance drafts from rough notes
- User story splitting
- Competitor and market summaries (verify sources)
- Release notes and changelogs
- Interview guides and synthesis of notes you provide

**A human must review**

- Problem is real and stated without a solution
- Every requirement is testable
- Out-of-scope list exists
- Numbers and market claims have sources
- Legal, privacy and safety implications raised

**Prompts that work**

- "Interview me about <idea> one question at a time, then write spec.md; mark unknowns, do not guess."
- "Split this spec into milestones that each ship user value."

**Limit**: Do not invent user research, quotes or metrics.

## UX and UI design

**Delegate to AI**

- Flow and state inventories
- Copy and microcopy drafts
- Token and theme variants
- Accessibility checklists per screen
- Design critique against DESIGN.md

**A human must review**

- Looks distinctive, not generic AI output
- Contrast, focus, target sizes, reduced motion
- Every state designed: loading, empty, error, offline
- Copy tested with a real user
- Consistent with tokens across all stacks

**Prompts that work**

- "List every state of <screen> and what the user sees and can do in each."
- "Critique this screenshot against DESIGN.md: five concrete fixes, ranked."

**Limit**: Do not copy another product's brand assets or layouts.

## Technical writing

**Delegate to AI**

- README and how-to drafts
- ADR drafts from a decision you describe
- API docs from the contract
- Changelog from merged PRs
- Docs consistency sweeps

**A human must review**

- Every command was run once and works
- No claims the code does not back
- Examples use neutral names and synthetic data
- Short: cut filler
- Links resolve

**Prompts that work**

- "Write the README section for <feature>; run each command and paste the real output."
- "Compare docs/ARCHITECTURE.md with the code and list every difference."

**Limit**: Do not document features that do not exist.
