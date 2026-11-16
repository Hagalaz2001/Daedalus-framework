import { lt } from "drizzle-orm";
import { idempotencyKeys } from "../../shared/db/schema.ts";
import type { Deps } from "../../shared/http/types.ts";
import type { Handler } from "./queue.ts";

/** Your jobs: name -> handler. Handlers must be safe to run twice (a retry after a crash repeats work). */
export const handlers = (deps: Deps): Record<string, Handler> => ({
  // Idempotency keys only matter for a day; delete the rest.
  "idempotency.cleanup": async () => {
    await deps.db.delete(idempotencyKeys).where(lt(idempotencyKeys.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));
  },
});

/** Cron schedules (UTC), only with Postgres: job name -> cron expression. */
export const schedules: Record<string, string> = {
  "idempotency.cleanup": "17 * * * *",
};
