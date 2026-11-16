# Project constitution

Rules every spec, plan and task must respect. Edit them to fit the project; keep them short.

1. A human owns and approves every change. AI drafts. (`docs/RESPONSIBLE-AI.md`)
2. Contract first: the API changes in `contracts/openapi.yaml`, then clients are generated.
3. Tests before "done"; every screen has loading, empty and error states.
4. No secrets in the repo, prompts or logs. No real personal data in fixtures.
5. Smallest change that meets the acceptance criteria. No speculative features.
6. Anything irreversible (deploy, delete data, move money, change access) is done or approved by a human.
