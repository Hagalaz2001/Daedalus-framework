# Deployment pipeline

```mermaid
flowchart LR
  PR["Pull request"] --> CI["CI<br/>deno task check: sync, lint, types, tests, audit, secret scan"]
  CI -- fails --> PR
  CI -- passes --> M["Merge to main"]
  M --> B1["Backend image<br/>docker build, push to registry"]
  M --> B2["Web build<br/>static files or SSR bundle"]
  M --> B3["Mobile builds<br/>Android bundle, iOS archive"]
  M --> B4["Desktop installers"]
  B1 --> S["Staging"]
  B2 --> S
  S --> V["Smoke test<br/>GET /ready, sign in, one write"]
  V --> G{"Human approves release"}
  G --> P1["Production backend<br/>Fly.io, Render, Railway or a Docker host"]
  G --> P2["Production web<br/>Vercel or static hosting"]
  G --> P3["Stores<br/>TestFlight and Play internal track first, then staged rollout"]
  G --> P4["Desktop release assets"]
  P1 --> MON["Monitor<br/>logs, errors, readiness, backups"]
```

Migrations run when the first new backend instance starts, so deploy the backend before the clients that need new fields
and follow the zero-downtime rules in [../DATABASE.md](../DATABASE.md). Targets, secrets and the incident checklist:
[../OPERATIONS.md](../OPERATIONS.md).
