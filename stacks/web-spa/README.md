# web-spa: React single-page app

Daedalus stack for a signed-in web app: React 19, Vite, TypeScript, Tailwind v4, TanStack Query, React Router and the
Better Auth cookie client. UI comes from the shared kit (`packages/ui`, imported as `@app/ui`); data comes only from the
generated API client (`@app/api`, from `contracts/openapi.yaml`).

Ships with these screens, all wired to the API and each with loading, empty and error states: sign in, sign up,
forgot password, onboarding, dashboard, notes list with search and filters, note detail with delete, create form,
settings (theme, notification switches), profile with account deletion, and not found.

## Run

From the project root (after `deno install`):

```sh
deno task sync        # regenerates the API client and the theme from design/tokens.json
deno task dev:backend # the API on :8787 (optional but needed for real data)
deno task dev:web     # this app on :5173
```

`VITE_API_BASE_URL` points the app at another backend (see `.env.example`).

## Test and check

```sh
deno task --cwd apps/web test    # Vitest + Testing Library (states, validation, a11y basics)
deno task --cwd apps/web check   # typecheck, lint, tests, production build
```

## Structure

```
src/
  app/            routes and the signed-in / signed-out guards (composition only)
  features/<x>/   one folder per feature, public entry is index.ts
    ui/           screens and components
    state/        hooks that talk to the data layer (TanStack Query, auth)
    data/         API access through the generated client
    model/        types and pure logic (validation, filtering): easy to unit test
  shared/
    api/          the one place the typed client is created (`api`, `unwrap`)
    lib/          config, formatting, storage helpers
    ui/           app-level pieces: QueryBoundary (loading / error / empty), RouterLink
```

## Conventions

- A feature imports another feature only through its `index.ts`, never its internals; `shared/` never imports
  features. `deno task lint:boundaries` (root) enforces it. Inside a feature the layers point one way: ui, state, data, model.
- No hand-written `fetch` to the backend. Add the operation to `contracts/openapi.yaml`, run `deno task sync`, call it
  from a feature's `data/` folder.
- Wrap every data screen in `QueryBoundary` so loading, error and empty states cannot be forgotten.
- No hard-coded colours or radii: use the token utilities (`bg-primary`, `text-text-muted`, `border-border`, `rounded-md`).
- Targets are at least 44 px; keep it that way when adding controls.

## Known gaps (need a backend change)

- Edit note: the contract has no update operation; `NoteForm` already accepts `initialText` for it.
- Note detail reads from the cached list: the contract has no `GET /notes/{id}`.
- Forgot password and account deletion call Better Auth endpoints that the backend must enable
  (`emailAndPassword.sendResetPassword`, `user.deleteUser.enabled`). Until then the screens show the server's error.
- Onboarding and notification preferences are stored per browser (localStorage), not per user.
