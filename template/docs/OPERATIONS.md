# Operations

How to run the backend and the web apps outside your laptop: environments, configuration, secrets, the container, deploy
targets, backups, monitoring and what to do when something breaks. Everything here is generic: replace `example.com` and
names with yours.

Status of the commands below: `deno task --cwd backend start`, the `/health` and `/ready` checks and the environment
validation were run and tested. The Docker image and the Fly.io, Render, Railway and Compose snippets follow each
platform's documented format but were not run by the framework's own tests (no Docker host in CI here), so build and
smoke-test them in staging first.

## Environments

| Environment | Purpose                            | Database                                           | `APP_ENV`     |
| ----------- | ---------------------------------- | -------------------------------------------------- | ------------- |
| local       | development                        | PGlite in `backend/.data/` (or any `DATABASE_URL`) | `development` |
| test        | `deno task check`, CI              | PGlite in memory, thrown away                      | `test`        |
| staging     | production twin for release checks | its own Postgres, never production data            | `production`  |
| production  | real users                         | managed Postgres with backups                      | `production`  |

Staging runs the same image and the same settings as production with different secrets and data. If a bug can only be
seen in production, make staging able to show it.

## Environment variables

Read and validated once at boot (`backend/src/shared/config/config.ts`); the process refuses to start and lists every
problem if something is missing or malformed. Copy `backend/.env.example` to `backend/.env` locally.

| Variable                | Required                     | Default                        | Meaning                                                                                                         |
| ----------------------- | ---------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`               | no                           | `development`                  | `development`, `test` or `production`; production turns the strict checks on                                    |
| `PORT`                  | no                           | `8787`                         | HTTP port                                                                                                       |
| `DATABASE_URL`          | production                   | empty (PGlite)                 | Postgres connection string; use the pooler URL on serverless hosts                                              |
| `MONGODB_URI`           | production (MongoDB flavour) | empty (managed local `mongod`) | MongoDB connection string; plays the role of `DATABASE_URL` in a `--db mongodb` project                         |
| `PGLITE_DIR`            | no                           | `.data/pglite`                 | Folder of the embedded database when no database URL is set (the MongoDB flavour keeps `.data/mongo` beside it) |
| `BETTER_AUTH_SECRET`    | production                   | dev value                      | 32+ random characters; signs sessions. Rotating it signs everyone out                                           |
| `BETTER_AUTH_URL`       | production                   | `http://localhost:<PORT>`      | Public URL of the API                                                                                           |
| `AUTH_TRUSTED_ORIGINS`  | production                   | `http://localhost:5173`        | Comma-separated web origins allowed to use cookies                                                              |
| `LOG_LEVEL`             | no                           | `info`                         | `debug`, `info`, `warn`, `error`                                                                                |
| `RATE_LIMIT_PER_MINUTE` | no                           | `120`                          | Requests per client per minute (auth endpoints: 30)                                                             |
| `TRUST_PROXY`           | no                           | `false`                        | `true` behind a reverse proxy you control, so the real client address is used                                   |
| `ADMIN_EMAILS`          | no                           | empty                          | Platform operators (admin and flags modules)                                                                    |

Each installed module adds its own variables to `.env.example` and its doc (`S3_*`, `STRIPE_*`, `EMAIL_*`, `SENTRY_DSN`,
`OTEL_*` ...). Web apps read build-time variables prefixed `VITE_` (for example `VITE_API_BASE_URL`); those are public
by design, never put a secret in them.

## Secrets

- Secrets live in the platform's secret store (Fly secrets, Render environment groups, Railway variables, GitHub Actions
  secrets) or an `.env` file on the server that only the service user can read. Never in git, images, logs or chat.
  `.env` is git-ignored; `deno task secrets` scans the repository for leaked keys.
- One secret per environment: staging and production never share `BETTER_AUTH_SECRET`, database passwords or API keys.
- Give each key the least power it needs: a bucket-scoped storage key, a Stripe restricted key, a database role that is
  not the owner for the application when you can.
- Rotate on a schedule and immediately after anyone with access leaves or a key appears anywhere it should not. Stripe
  and similar services let two keys overlap: add the new one, deploy, revoke the old one.
- Stripe: test keys (`sk_test_...`) everywhere except production, and only after the payments flow has been reviewed.

## Container image

`backend/Dockerfile` builds from the repository root (the lockfile and `contracts/` live there):

```
docker build -f backend/Dockerfile -t app-backend .
docker run --rm -p 8787:8787 --env-file backend/.env app-backend
```

It runs the TypeScript sources with Deno 2 as a non-root user, applies migrations on start and has a health check on
`/health`. Image size is small because Deno needs no build step; pin the Deno version (it is in the `FROM` line) and
update it deliberately. For production set `APP_ENV=production` (already the image default) and the required variables
above; the container exits with a clear message if any is missing.

Endpoints for orchestrators: `GET /health` (liveness: the process answers) and `GET /ready` (readiness: the database
answers). Send traffic only when `/ready` is 200; restart only when `/health` fails. On `SIGTERM` the server stops
accepting connections, lets in-flight requests finish (10 seconds at most), stops job workers and closes the database.

## Deploy targets

Pick one for the backend; the web app is usually separate static hosting (Vercel below). All of them need a managed
Postgres (Supabase, Neon, the platform's own) with its URL in `DATABASE_URL`.

### Fly.io

```toml
# fly.toml (repository root)
app = "my-app-backend"
primary_region = "fra"

[build]
  dockerfile = "backend/Dockerfile"

[http_service]
  internal_port = 8787
  force_https = true
  min_machines_running = 1

  [[http_service.checks]]
    path = "/ready"
    interval = "15s"
    timeout = "3s"
    grace_period = "30s"
```

`fly launch --no-deploy`, then
`fly secrets set DATABASE_URL=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=... AUTH_TRUSTED_ORIGINS=... TRUST_PROXY=true`,
then `fly deploy`. Several machines are fine: in-memory rate limits and realtime channels are per machine (see the
module docs).

### Render

```yaml
# render.yaml
services:
  - type: web
    name: app-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    healthCheckPath: /ready
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: BETTER_AUTH_SECRET
        generateValue: true
      - key: BETTER_AUTH_URL
        sync: false
      - key: AUTH_TRUSTED_ORIGINS
        sync: false
      - key: TRUST_PROXY
        value: "true"
```

### Railway

Create a service from the repository, set the variable `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile` so it builds the
image above, add the variables from the table, and set the health check path to `/ready` in the service settings.
Railway can also host the Postgres.

### A VPS with Docker Compose

```yaml
# compose.yaml (on the server, next to backend/.env)
services:
  backend:
    build: { context: ., dockerfile: backend/Dockerfile }
    env_file: backend/.env
    restart: unless-stopped
    depends_on: [db]
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: app
    secrets: [db_password]
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile:ro", "caddy:/data"]
    restart: unless-stopped
secrets:
  db_password: { file: ./secrets/db_password }
volumes: { pgdata: {}, caddy: {} }
```

`Caddyfile`: `api.example.com { reverse_proxy backend:8787 }` (Caddy gets the TLS certificate by itself). In
`backend/.env` set `DATABASE_URL=postgres://postgres:<password>@db:5432/app`, `TRUST_PROXY=true` and the other
variables. Close every port except 22, 80 and 443 in the firewall, never publish Postgres, keep the OS patched and
schedule the backups below. Update with `git pull && docker compose up -d --build`.

### Vercel (web apps)

The web-spa and web-site stacks ship a `vercel.json`. Import the repository, set the root directory to the app folder
(for example `apps/web`), set `VITE_API_BASE_URL` (or the site's equivalent) to the API's public URL and add the web
origin to the backend's `AUTH_TRUSTED_ORIGINS`. Preview deployments get their own URLs: add them to the trusted origins
only if you want sign-in to work there. Serve the API under the same parent domain as the web app (`app.example.com` and
`api.example.com`) so session cookies are first-party.

### Mobile and desktop

Store builds, signing and release tracks are described in each stack's README. Keep signing keys and store credentials
in the CI secret store, ship to TestFlight and the Play internal track first, then roll out gradually.

## Backups

- **Postgres:** provider backups with point-in-time recovery turned on, plus a logical dump before risky migrations;
  commands and a restore rehearsal are in [DATABASE.md](DATABASE.md#backups-and-restore).
- **Object storage:** enable bucket versioning or a replication rule; deleting a file in the app only soft-deletes its
  row.
- **Configuration:** the repository holds the infrastructure files; keep a password-manager entry or sealed note listing
  where every secret lives and who can rotate it.
- Decide and write down the recovery point (how much data you can lose) and recovery time (how long you can be down);
  the backup schedule must meet them.

## Monitoring

- **Logs:** one JSON line per request with the request id (`method`, `path`, `status`, `ms`); errors include the id too.
  Ship stdout to the platform's log search. When a user reports a problem, ask for the time and the `requestId` shown in
  the error response.
- **Errors:** the error-tracking module reports unexpected errors with the request id.
- **Traces and metrics:** the observability module with `OTEL_DENO=true` exports OpenTelemetry to any collector.
- **Uptime:** an external probe on `https://api.example.com/ready` every minute from outside your provider, alerting
  after two failures. A second probe on the web app's home page.
- **Alert on symptoms:** error rate, p95 latency, readiness failures, queue backlog (jobs module), disk and database
  connection use. Alerts go to a channel someone reads; every alert needs an owner and an action.

## Incident checklist

1. **Acknowledge** in the team channel; name one person leading. Note the start time.
2. **Assess** impact in plain words: who is affected, which feature, since when, is data at risk? Check `/ready`, the
   error tracker, the last deploy and the provider status pages.
3. **Stabilize first.** Roll back the last deploy (redeploy the previous image or release) or switch the feature off
   with a flag; do not debug live if a rollback restores service. A migration that already ran is rolled forward with a
   fix, not edited ([DATABASE.md](DATABASE.md)).
4. **Communicate:** a short status note to users when they are affected, then updates at a fixed interval.
5. **Security incident?** Rotate the exposed secrets, revoke sessions (rotate `BETTER_AUTH_SECRET`), preserve logs, and
   follow your legal duties on breach notification.
6. **Fix and verify** in staging, deploy, confirm with the original reproduction and the monitors.
7. **Close with a review within a week:** timeline, root cause, what detected it, what would have detected it sooner,
   and two or three concrete follow-ups with owners. Blameless; add the missing test or alert. Record it in
   `docs/REPORT.md`.
