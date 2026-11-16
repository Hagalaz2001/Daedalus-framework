# Backend

Hono on Deno, PostgreSQL through Drizzle (or MongoDB through Mongoose: `--db mongodb`), accounts through Better Auth.
Contract first: `contracts/openapi.yaml` is the API; the backend validates every request against it and a test fails
when a route and the contract disagree.

```
deno task --cwd backend dev          # watch mode on http://localhost:8787 (PGlite database in backend/.data/)
deno task --cwd backend seed         # fake development data: ada@example.com / password1234
deno task --cwd backend check        # format, lint, typecheck, all tests, ERD up to date
```

Open `http://localhost:8787/docs` for the API reference built from the contract. Health: `/health`, readiness: `/ready`.

## Layout

```
src/
  main.ts                 boot: config, database, modules, server, graceful shutdown
  app.ts                  the middleware chain and module discovery (see docs/diagrams/request-lifecycle.md)
  modules/<feature>/      mod.ts (exports the Module), routes.ts, service.ts, repository.ts, schema.ts, tests/
  shared/
    config/ db/ auth/ errors/ validation/ logging/ http/ mail/
scripts/                  seed, diagrams (ERD), modules-apply
drizzle/                  committed SQL migrations
```

Rules: routes translate HTTP only; services hold business rules; repositories hold SQL and always take the
`organizationId`; a feature never imports another feature's internals (talk through `shared/`). New feature: copy
`src/modules/notes`, add its paths to the contract, `deno task --cwd backend db:generate --name add_<feature>`, write
tests with `createTestApp()` (`src/shared/testing.ts`).

Conventions for errors (RFC 9457 `application/problem+json`), pagination (`limit` + `cursor`, `X-Next-Cursor`),
idempotency (`Idempotency-Key`), tenancy and ids: [docs/DATABASE.md](../docs/DATABASE.md) and the contract's
description. Optional features: [docs/MODULES.md](../docs/MODULES.md). Deploying:
[docs/OPERATIONS.md](../docs/OPERATIONS.md).
