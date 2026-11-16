# Architecture

The rules every app in this repository follows, whatever its stack. They are the same on purpose: a person or an agent
who knows one app can work in another. What can be checked by a script is checked by `deno task check`.

## 1. Shape of the repository

```
contracts/openapi.yaml    the API (source of truth)
design/tokens.json        colours, radii, spacing, fonts (source of truth)
backend/                  Hono + Drizzle + PostgreSQL (optional)
packages/api_ts/          generated TypeScript client, shared by every TypeScript app and the backend
apps/<name>/              one folder per app; the stack of each is listed in .blueprint.json
packages/<stack package>  packages that belong to one stack (for example packages/app_core for Flutter)
scripts/                  sync, check, lint-boundaries, add-app, secret scan
docs/                     this file, ADRs, QA log, reports
```

Apps do not import each other. `packages/*` hold only generated code, stack-level design-system code or the API client;
nothing specific to one app.

## 2. Data flow: contract, client, state, UI

```
openapi.yaml --sync--> generated client --> data layer --> state --> UI
design tokens --sync--> theme file --------------------------------> UI
```

1. The contract defines every operation with an `operationId` and one tag.
2. `deno task sync` generates the client for each stack. Nobody edits generated files.
3. A feature's **data layer** wraps the generated client (a repository, a query function). It is the only place that
   talks to the network and the only place that maps transport errors to the app's error type.
4. **State** (hooks, stores, providers) depends on the data layer, never on the client directly.
5. **UI** depends on state. UI never calls the data layer or the client, and never formats raw errors.

Direction of dependency is one way: ui -> state -> data -> model. A lower layer never imports a higher one.

## 3. Feature-first modules

A feature is a folder that owns everything for one user-visible capability:

```
features/<name>/
  ui/ (or presentation/)   screens and widgets, with loading, empty and error states
  state/                   hooks, stores or providers
  data/                    repository over the generated client
  model/                   types and pure logic (only when there is real logic)
  index.ts  |  <name>.dart public entry: the only file other code may import
  tests next to the code (or test/features/<name>/ in Flutter)
```

Boundary rules, enforced by `deno task lint:boundaries`:

- Code outside a feature imports it only through its public entry (`features/<name>` or `features/<name>/index` in
  TypeScript, `features/<name>/<name>.dart` in Dart).
- A feature never imports another feature's internals. If two features need the same code, move that code to `shared/`
  (TypeScript) or `core/` (Dart).
- `shared/` and `core/` never import a feature.
- Application wiring (routes, `main`, providers at the root) is the only place that composes features.

Shared code is split by purpose: `shared/ui` (design-system components), `shared/lib` (utilities with no UI),
`shared/api` (client instance and error mapping). In Flutter the same role is played by `core/` and `packages/app_core`.

## 4. Folder trees per stack

Stack-specific details (commands, libraries, conventions) are in each app's own README. The shapes below are the
contract between stacks; a stack README documents any difference.

TypeScript apps (web-spa, web-spa-vue, web-site-astro, web-site-next, mobile-rn, desktop-tauri frontend):

```
apps/<name>/src/
  app/ or routes/          routing and composition only
  features/<feature>/      see section 3
  shared/{ui,lib,api}/
  styles/tokens.*          generated
```

Flutter (`mobile-flutter`):

```
apps/<name>/lib/
  main.dart                composition root
  core/                    providers shared by features (API client, auth)
  features/<feature>/{data,domain,presentation}/<feature>.dart
packages/app_core/         generated API client, generated tokens, appTheme()
```

Rust desktop (`desktop-gpui`, the Rust side of `desktop-tauri`):

```
apps/<name>/crates/ or src/
  features/<feature>/      module with a `mod.rs` that re-exports only its public items
  shared/                  design-system views and utilities
```

Rust visibility (`pub(crate)`, private modules) enforces the boundary in the compiler; `cargo clippy` and `cargo test`
are the checks. `deno task lint:boundaries` covers TypeScript and Dart only.

## 5. Error handling

- Handle errors at boundaries: the data layer converts network and parsing failures into one typed error (kind,
  user-facing message, optional retry hint). Backend routes validate input at the edge and return the contract's `Error`
  shape.
- State exposes `loading | data | empty | error` explicitly; UI renders each of the four. No screen shows a blank area
  while loading or a raw exception.
- Never swallow an error silently. Either handle it (retry, fallback, message) or let it reach the boundary.
- Do not log secrets, tokens or personal data.

## 6. Testing pyramid

| Level              | What                                                                    | Where            | How many          |
| ------------------ | ----------------------------------------------------------------------- | ---------------- | ----------------- |
| Unit               | pure logic, mappers, state                                              | next to the code | many, fast        |
| Component / widget | one screen with a fake data layer, all four states                      | next to the code | one per screen    |
| Contract / API     | backend routes through `app.request(...)` against an in-memory database | `backend/test/`  | one per operation |
| End to end         | one happy path per app in the real runtime                              | per stack README | few               |

Every feature ships unit and component tests. A change to the contract updates the backend test first. Tests use fakes
of the data layer, not the network.

## 7. Naming

- Folders and files: `kebab-case` for TypeScript files and folders, `snake_case` for Dart and Rust, components in
  `PascalCase.tsx`.
- Features are named for the user capability (`notes`, `billing`), not the technology (`api`, `forms`).
- API: `operationId` is `verbNoun` (`listNotes`, `createNote`); one tag per resource; the tag becomes the client name.
- Tokens are semantic (`primary`, `surfaceMuted`, `danger`), never the colour (`blue500`).
- Commits follow `CONTRIBUTING.md`.

## 8. What not to do

- No hand-written `fetch` or HTTP code against the backend in an app.
- No hard-coded colours, spacing or radii: use the generated tokens.
- No shared UI code between stacks; share the contract and the tokens.
- No new top-level folder or app without `deno task add-app` and an ADR when it changes the rules above.

Decisions that changed or added to these rules are recorded in `docs/adr/`. Related documents: `docs/diagrams/README.md` (diagram index), `docs/DATABASE.md`
(schema and migrations), `docs/MODULES.md` (optional feature modules), `docs/OPERATIONS.md` (deploy, monitoring,
backups) and `docs/diagrams/`.
