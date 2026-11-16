# Background jobs module

Work that should not block a request (sending mail, resizing, digests, cleanups) goes on a queue.

```ts
import { jobs } from "../jobs/mod.ts";
await jobs().enqueue("email.digest", { userId }, { delaySeconds: 60 });
```

Add the handler to `backend/src/modules/jobs/handlers.ts` (name -> function) and, for recurring work, a cron expression
in `schedules`. Handlers must be safe to run twice: a retry after a crash repeats the work.

| Database                      | Queue                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` set (Postgres) | pg-boss: durable, shared by all instances, 3 retries with exponential backoff, cron schedules. It creates its own `pgboss` schema on start; no Redis |
| local PGlite                  | in-process queue with the same API: not persisted, no cron (a warning says so)                                                                       |

Failed jobs stay visible in the `pgboss.job` table for inspection. Scale workers by running more backend instances;
split them into a worker-only deployment later by starting only this module's `start`. The shipped job,
`idempotency.cleanup`, deletes idempotency keys older than a day.

The pg-boss test runs against PGlite served on a local TCP port, so it needs no Postgres install.
