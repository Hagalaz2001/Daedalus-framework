import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser } from "../../shared/auth/session.ts";
import type { Db } from "../../shared/db/client.ts";
import { notFound } from "../../shared/errors/problem.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { pushTokens } from "./schema.ts";
import { type Notice, sendExpo, sendFcm, sendWeb } from "./senders.ts";

type Platform = typeof pushTokens.$inferSelect["platform"];

const senders: Record<Platform, (token: string, n: Notice) => Promise<"sent" | "gone">> = {
  expo: sendExpo,
  fcm: (token, n) => sendFcm(token, n),
  web: sendWeb,
};

/**
 * Push `notice` to every device of a user. Dead tokens are deleted. A failing platform does not stop the others;
 * the returned count is how many deliveries succeeded. Call it from a job (jobs module) for anything slow.
 */
export async function sendPush(db: Db, userId: string, notice: Notice, send = senders): Promise<number> {
  let delivered = 0;
  for (const row of await db.select().from(pushTokens).where(eq(pushTokens.userId, userId))) {
    try {
      if (await send[row.platform](row.token, notice) === "gone") {
        await db.delete(pushTokens).where(eq(pushTokens.id, row.id));
      } else delivered++;
    } catch (e) {
      console.error(JSON.stringify({ level: "error", msg: "push failed", platform: row.platform, error: String(e) }));
    }
  }
  return delivered;
}

export default {
  name: "push",
  routes: ({ db }) =>
    new Hono<AppEnv>()
      .put("/push/tokens", async (c) => {
        const user = requireUser(c);
        const { platform, token } = c.get("body") as { platform: Platform; token: string };
        const [row] = await db.insert(pushTokens).values({ userId: user.id, platform, token })
          .onConflictDoUpdate({ target: pushTokens.token, set: { userId: user.id, platform } }).returning();
        return c.json({ id: row!.id, platform: row!.platform });
      })
      .delete("/push/tokens/:id", async (c) => {
        const user = requireUser(c);
        const rows = await db.delete(pushTokens).where(
          and(eq(pushTokens.id, c.req.param("id")), eq(pushTokens.userId, user.id)),
        )
          .returning({ id: pushTokens.id });
        if (!rows.length) throw notFound("Token not found");
        return c.body(null, 204);
      }),
} satisfies Module;
