# Roles and permissions module

Organization roles (`owner`, `admin`, `member`) come from Better Auth's organization plugin. This module maps roles to
permissions in one file, `backend/src/modules/rbac/policy.ts`:

```ts
can("member", "note:delete"); // false
permissionsFor("admin"); // ["note:read", "note:create", ...]
```

- **API.** `operationPermissions` in `mod.ts` names the permission each contract operation needs (`DELETE /notes/{id}`
  needs `note:delete`); the middleware enforces it before the route runs and answers 403 problem+json. For custom
  checks: `await requirePermission(c, db, "member:invite")`.
- **Web and React Native.** `policy.ts` is copied to `src/shared/lib/policy.ts` of every app of those stacks: use
  `can(role, "note:delete")` to hide controls. Get the role from `GET /permissions`.
- **Flutter.** Call `GET /permissions` and keep the returned permission list; there is no Dart copy of the policy.

Hiding a button is only UX; the API is the authority. To add a role, extend `roles` and the permission lists; to add a
permission, add a key and, if an operation needs it, a line in `operationPermissions`.
