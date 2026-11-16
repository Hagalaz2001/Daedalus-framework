# Admin panel module

List, search, edit and delete rows of the tables you register, for platform administrators (the emails in
`ADMIN_EMAILS`; everyone else gets 403).

**Backend.** `backend/src/modules/admin/resources.ts` is the registry:

```ts
{ name: "notes", label: "Notes", table: notes, editable: ["text"], deletable: true }
```

From the Drizzle table the module derives the column metadata (`GET /admin/resources`) and the generic endpoints
`GET /admin/{resource}`, `GET|PATCH|DELETE /admin/{resource}/{id}`. Only `editable` columns can be changed (anything
else is a 400), tables with `deleted_at` are soft-deleted, and lists use the same keyset pagination and `q` search as
the rest of the API. Do not register sessions, accounts or other credential tables.

**Web (web-spa).** Installing copies `src/features/admin/` into each web-spa app. It reads the metadata through the
generated client and builds a table with inline editing, so a newly registered resource appears without UI work. Add the
route and nav entry shown in `features/admin/index.ts`. The screen works on the shared UI kit and tokens; restyle it
there. Other stacks: call the same endpoints (see `/docs` once the API runs).
