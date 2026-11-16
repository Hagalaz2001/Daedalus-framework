# web-spa-vue: Vue single-page app

Daedalus stack for a signed-in web app in Vue: Vue 3, Vite, TypeScript (strict), Tailwind v4, Pinia, TanStack Query
(Vue), Vue Router and the Better Auth cookie client. UI comes from the shared Vue kit (`packages/ui-vue`, imported as
`@app/ui-vue`: shadcn-vue style components on Reka UI); data comes only from the generated API client (`@app/api`).

It ships the same screens as `web-spa`, all wired to the API with loading, empty and error states: sign in, sign up,
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
deno task --cwd apps/web test    # Vitest + Testing Library DOM (states, validation, a11y basics)
deno task --cwd apps/web check   # typecheck (vue-tsc), lint, tests, production build
```

## Structure

```
src/
  app/            routes and the signed-in layout (composition only)
  features/<x>/   one folder per feature, public entry is index.ts
    ui/           screens and components (.vue)
    state/        composables over the data layer (TanStack Query, auth session, Pinia stores)
    data/         API access through the generated client
    model/        types and pure logic (validation, filtering): easy to unit test
  shared/
    api/          the one place the typed client is created (`api`, `unwrap`)
    lib/          config, formatting, storage helpers
    ui/           app-level pieces: QueryBoundary (loading / error / empty), RouterLink
```

## Conventions

- A feature imports another feature only through its `index.ts`; `shared/` never imports features
  (`deno task lint:boundaries` at the root enforces it). Inside a feature: ui, state, data, model, one direction.
- No hand-written `fetch` to the backend: add the operation to `contracts/openapi.yaml`, run `deno task sync`.
- Wrap data screens in `QueryBoundary` so loading, error and empty states cannot be forgotten.
- No hard-coded colours or radii: use the token utilities (`bg-primary`, `text-text-muted`, `border-border`, `rounded-md`).
- Slots instead of render props: `Field` passes `fieldProps` to its control (`<template #default="{ fieldProps }">`).

## Known gaps (need a backend change)

Same as `web-spa`: no update operation for notes, no `GET /notes/{id}`, forgot password and account deletion need the
matching Better Auth options on the backend, onboarding and notification preferences are stored per browser.

## Notes for Deno

`vue-tsc` cannot use the native TypeScript 7 compiler yet, so `deno task typecheck` runs it through
`scripts/typecheck.mjs` against TypeScript 5.9 (dependency `typescript5`). Switch back to plain `vue-tsc --noEmit` once supported.
