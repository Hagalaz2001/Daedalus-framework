# Modules

Optional features you add to a Daedalus project when it needs them: sign-in extras, roles, payments, mail, files, jobs
and so on. A module is a folder in the framework's `modules/` directory; adding one copies its files into your
project, wires its dependencies, environment variables and API contract, and generates the database migration. Nothing
is enabled until you add it, and the base stays small.

```
daedalus new shop --modules email,storage        # at creation
daedalus add-module rbac,audit                   # later, from the project folder (deno task add-module rbac,audit)
```

After adding: review the diff, `deno task sync` (regenerates every client from the extended contract), `deno task check`,
commit the new migration in `backend/drizzle/`. Remove a module by deleting `backend/src/modules/<name>/` and its
migration if it has not shipped.

## What is in the box

"Full" modules have complete behaviour and tests that run in `deno task check`. "Thin" modules install, compile, have a
documented API and a small test, but cover the common case only; their doc says what is missing.

| Module | Status | What it gives you | Doc (after install) |
| --- | --- | --- | --- |
| `auth-extras` | full | GitHub and Google sign-in, magic links, two-factor (TOTP) | `docs/modules/auth-extras.md` |
| `rbac` | full | Role -> permission policy used by the API and copied to web and React Native apps | `docs/modules/rbac.md` |
| `email` | full | Resend, SMTP or console mail; React Email templates; reset mail through it | `docs/modules/email.md` |
| `storage` | full | Signed-URL uploads and downloads on any S3-compatible store | `docs/modules/storage.md` |
| `jobs` | full | pg-boss queue with retries and cron on Postgres; in-process queue locally | `docs/modules/jobs.md` |
| `audit` | full | Automatic audit trail of writes, readable by owners and admins | `docs/modules/audit.md` |
| `flags` | full | Database-backed feature flags with percentage rollout | `docs/modules/flags.md` |
| `admin` | full | Generic list/edit/delete for registered tables, plus a web-spa screen | `docs/modules/admin.md` |
| `payments` | thin | Stripe Checkout (subscriptions) and a verified webhook; test mode | `docs/modules/payments.md` |
| `push` | thin | Device tokens and `sendPush` for Expo, FCM and web push | `docs/modules/push.md` |
| `i18n` | thin | Shared JSON message catalog, `t()`, Accept-Language, parity check | [i18n](modules/i18n.md) |
| `observability` | thin | OpenTelemetry span attributes, PostHog and Plausible events | `docs/modules/observability.md` |
| `error-tracking` | thin | Sentry or GlitchTip error reports tagged with the request id | `docs/modules/error-tracking.md` |
| `search` | thin | Ranked Postgres full-text search over notes | `docs/modules/search.md` |
| `realtime` | thin | Server-sent events per organization with `publish()` | `docs/modules/realtime.md` |

Third-party packages each module uses are listed in `modules/<name>/THIRD_PARTY.md` (all MIT, MIT-0 or Apache-2.0).

## How a module plugs into the backend

The backend discovers `backend/src/modules/*/mod.ts` at boot; each default-exports a `Module` (all members optional):

| Member | Purpose |
| --- | --- |
| `setup(base)` | Runs first, before auth is built: install a mailer, start an SDK |
| `auth(base)` | Returns Better Auth options (plugins, social providers, email callbacks), merged across modules |
| `middleware(deps)` | Global middleware, installed before any route (audit, permissions, tracing) |
| `routes(deps)` | A Hono app mounted at `/`. Every route must exist in the contract; a test fails otherwise |
| `start(deps)` / `stop()` | Background work that starts after the server is up and stops on graceful shutdown |

Seams between modules go through the base, never module-to-module: `shared/mail/mailer.ts` is the mailer port (email
module installs the implementation; auth-extras and the base use it), the `audit_log`, `files` and `notifications`
tables live in the base schema, and platform operators are named in `ADMIN_EMAILS`.

## Module folder format

```
modules/<name>/
  module.json            generator manifest (below)
  THIRD_PARTY.md         licences of what it pulls in
  files/                 copied into the project root, never overwriting an existing file
    backend/src/modules/<name>/{mod.ts, schema.ts, ..., tests/, setup.json, contract.yaml}
    docs/modules/<name>.md
```

### `module.json` (read by the generator)

```json
{
  "name": "storage",
  "title": "File storage",
  "status": "full",
  "summary": "One sentence for catalogs and --help.",
  "requires": { "backend": true, "modules": [], "stacks": [] },
  "files": "files",
  "tasks": { "i18n:check": { "cwd": ".", "run": "deno run -A i18n/check.ts" } },
  "install": [{ "cwd": ".", "run": "deno task --cwd backend modules:apply storage" }],
  "sync": [],
  "check": [],
  "routes": ["POST /files"],
  "ui": { "web-spa": ["src/features/admin"] },
  "docs": "docs/modules/storage.md"
}
```

| Key | Read by | Meaning |
| --- | --- | --- |
| `name`, `title`, `summary`, `status` (`full`/`thin`), `routes`, `ui`, `docs` | people, catalogs | Description. `ui` lists what lands in each stack's app dir |
| `files` | generator | Folder (default `files`) copied into the project root |
| `requires` | generator | `backend`, `stacks`, `modules` that must exist |
| `tasks`, `install`, `sync`, `check` | generator | Root tasks added, commands run after copying, during `deno task sync`, and during `deno task check` |

`install` always runs `modules:apply`, which does what a file copy cannot, driven by `setup.json`.

### `setup.json` (read by `deno task --cwd backend modules:apply <name>`)

Lives at `backend/src/modules/<name>/setup.json` inside the project, so adding a module later works without the
framework checkout.

| Key | Effect |
| --- | --- |
| `deno.imports`, `deno.compilerOptions` | Merged into `backend/deno.json`; existing values win. Pin exact versions |
| `env` | `[{ name, example?, description }]` appended to `backend/.env.example` (skipped if present) |
| `contract` | A YAML fragment (`paths`, `components`, `tags`) merged into `contracts/openapi.yaml`; then the TypeScript client is regenerated |
| `database.authSchema` | Run `db:auth-schema` (Better Auth plugin tables) |
| `database.migration` | Run `db:generate --name add_<module>` and refresh the ERD |
| `ui.<stack>` | `[{ from, to }]`: copy `from` (relative to the module's backend folder) to `to` (relative to each app of that stack, per `.blueprint.json`); an app that already has the target is left alone. A `ui-templates/` folder in the module is deleted after install |

`modules:apply` is safe to run twice. Wire-up that cannot be automated (a route and nav entry in a web app) is written at
the top of the copied UI's `index.ts` and in the module's doc.

## Writing a module

1. Copy a small one (`modules/flags`) as a starting point. Keep a module to one capability.
2. Add routes to the **contract fragment first**; the base validates bodies and queries from it and a test fails if a
   route is missing from the contract.
3. Scope every query by `organizationId` (see DATABASE.md); take tenants from `requireTenant`.
4. Write tests with `createTestApp()` from `shared/testing.ts`: real migrations on in-memory Postgres, installed modules
   included.
5. Record packages and licences in `THIRD_PARTY.md` (MIT, Apache-2.0, BSD, ISC, CC0 or similar only).
6. In the framework repo, `deno run -A modules/verify.ts <name>` builds a project with the module, installs it and runs the
   backend's complete `deno task check`; without arguments it installs every module together.

## Not done yet

Modules cover the backend and, for rbac and admin, the TypeScript web and React Native apps. Flutter and desktop
screens for modules are not generated: use the generated client against the module's endpoints.
