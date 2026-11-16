# Modules

Optional backend features for projects made with Daedalus: auth extras, roles, email, file storage, background jobs,
audit log, feature flags, admin panel, payments, push, i18n, observability, error tracking, search and realtime.

- Add one: `daedalus add-module <name>` (or `--modules a,b` when creating a project).
- What each does, which are fully working and which are thin, the `module.json` and `setup.json` formats and how to
  write your own: [template/docs/MODULES.md](../template/docs/MODULES.md).
- Prove they install: `deno run -A modules/verify.ts [name ...]` builds a project from the template backend plus the
  modules and runs the backend's complete `deno task check` (all modules together when no name is given; slow, it
  installs every dependency). `deno test -A modules/modules_test.ts` is the fast structural check.

Each module's third-party packages and licences are in its `THIRD_PARTY.md`.
