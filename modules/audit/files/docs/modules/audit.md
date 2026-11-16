# Audit log module

Records who changed what.

- **Automatic.** Every successful non-GET request on a contract route writes a row to `audit_log`: actor, organization,
  operation (`DELETE /notes/{id}`), entity id from the path and the request id (so a log line, an error report and an
  audit row can be joined). Failed requests (4xx, 5xx) are not recorded. A failing audit write is logged and never
  breaks the request.
- **Explicit.** For events that are not one HTTP write:
  `await record(db, { action: "plan.change", actorId, organizationId, metadata: { from, to } })`.
- **Reading.** `GET /audit-log` (owners and admins), newest first, keyset pagination like every list.

The table is append-only by convention: no update or delete routes exist. Add a retention job (the jobs module) if
regulations require removing old rows.
