import { Hono } from "hono";
import { requirePlatformAdmin, requireUser } from "../../shared/auth/session.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { featureFlags } from "./schema.ts";
import { evaluateAll } from "./service.ts";

export { isEnabled } from "./service.ts";

export default {
  name: "flags",
  routes: ({ db, config }) =>
    new Hono<AppEnv>()
      .get("/flags", async (c) => c.json({ flags: await evaluateAll(db, requireUser(c).id) }))
      .put("/flags/:key", async (c) => {
        requirePlatformAdmin(c, config);
        const body = c.get("body") as { enabled: boolean; rolloutPercent?: number; description?: string };
        const values = {
          enabled: body.enabled,
          rolloutPercent: body.rolloutPercent ?? 100,
          description: body.description,
        };
        const [row] = await db.insert(featureFlags).values({ key: c.req.param("key"), ...values })
          .onConflictDoUpdate({ target: featureFlags.key, set: values }).returning();
        return c.json({
          key: row!.key,
          enabled: row!.enabled,
          rolloutPercent: row!.rolloutPercent,
          description: row!.description ?? undefined,
        });
      }),
} satisfies Module;
