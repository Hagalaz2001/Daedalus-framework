import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { AppError } from "../../shared/errors/problem.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";

export default {
  name: "health",
  routes: ({ db, logger }) =>
    new Hono<AppEnv>()
      // Liveness: the process answers. Orchestrators restart the container when this fails.
      .get("/health", (c) => c.json({ status: "ok" as const }))
      // Readiness: the database answers. Load balancers stop sending traffic when this fails.
      .get("/ready", async (c) => {
        try {
          await db.execute(sql`select 1`);
        } catch (e) {
          logger.error("readiness check failed", { error: String(e) });
          throw new AppError(503, "Service Unavailable", "Database is not reachable");
        }
        return c.json({ status: "ok" as const });
      }),
} satisfies Module;
