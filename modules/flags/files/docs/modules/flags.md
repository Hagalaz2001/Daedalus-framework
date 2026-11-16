# Feature flags module

Switch features on or off without a deploy, or roll them out to a share of users.

- **Manage.** Platform administrators (emails in `ADMIN_EMAILS`) call `PUT /flags/{key}` with
  `{ enabled, rolloutPercent?, description? }`; the admin module lists and edits the table too.
- **Read in clients.** `GET /flags` returns `{ flags: { "new-ui": true, ... } }` evaluated for the signed-in user. Fetch
  it once at start and when the app comes to the foreground.
- **Read in the backend.** `if (await isEnabled(db, "new-ui", user.id)) { ... }`. Unknown flags are off.
- **Rollout.** With `rolloutPercent: 25`, a stable 25% of users (a hash of flag key and user id) get the flag; raising
  the percentage only adds users. Anonymous callers only get fully rolled-out flags.

Flags are read from Postgres on each call. For heavy traffic cache the table in memory for a few seconds. Delete a flag
and its code branch together once it is fully on.
