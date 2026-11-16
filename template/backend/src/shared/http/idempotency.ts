import { and, eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import type { Db } from "../db/client.ts";
import { idempotencyKeys } from "../db/schema.ts";
import { AppError, badRequest, conflict } from "../errors/problem.ts";
import type { AppEnv } from "./types.ts";

const WRITES = new Set(["POST", "PATCH", "PUT"]);

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * `Idempotency-Key: <unique string>` on a write: the first request runs, a retry with the same key and body replays
 * the stored response (header `Idempotency-Replayed: true`) instead of writing twice. Same key with a different
 * body is a 422; a retry while the first is still running is a 409. Only signed-in callers (keys are per user).
 * Rows are small; delete old ones with a scheduled job (see docs/OPERATIONS.md).
 */
export const idempotency = (db: Db): MiddlewareHandler<AppEnv> => async (c, next) => {
  const key = c.req.header("idempotency-key");
  const user = c.get("user");
  if (!key || !user || !WRITES.has(c.req.method)) return next();
  if (key.length < 8 || key.length > 128) throw badRequest("Idempotency-Key must be 8-128 characters");

  const hash = await sha256(`${c.req.method} ${new URL(c.req.url).pathname} ${await c.req.raw.clone().text()}`);
  const claimed = await db.insert(idempotencyKeys).values({ userId: user.id, key, requestHash: hash })
    .onConflictDoNothing().returning();
  if (claimed.length === 0) {
    const [prev] = await db.select().from(idempotencyKeys).where(
      and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)),
    );
    if (prev?.requestHash !== hash) {
      throw new AppError(422, "Unprocessable Content", "Idempotency-Key was already used with a different request");
    }
    if (prev.status === null) throw conflict("A request with this Idempotency-Key is still being processed");
    c.header("Idempotency-Replayed", "true");
    return c.body(prev.body ?? "", prev.status as 200, { "content-type": "application/json" });
  }

  await next();
  if (c.res.status < 500) {
    await db.update(idempotencyKeys).set({ status: c.res.status, body: await c.res.clone().text() })
      .where(and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)));
  } else {
    // A server error must stay retryable.
    await db.delete(idempotencyKeys).where(and(eq(idempotencyKeys.userId, user.id), eq(idempotencyKeys.key, key)));
  }
};
