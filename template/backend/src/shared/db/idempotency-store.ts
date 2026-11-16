import { and, eq } from "drizzle-orm";
import type { Db } from "./client.ts";
import { idempotencyKeys } from "./schema.ts";

export interface StoredRequest {
  requestHash: string;
  /** null while the first request is still running. */
  status: number | null;
  body: string | null;
}

/** Storage behind the Idempotency-Key middleware (shared/http/idempotency.ts). The MongoDB flavour replaces this file. */
export const idempotencyStore = (db: Db) => {
  const mine = (userId: string, key: string) => and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key));
  return {
    /** True when this call created the row (it owns the key); false when the key already exists. */
    async claim(userId: string, key: string, requestHash: string): Promise<boolean> {
      const rows = await db.insert(idempotencyKeys).values({ userId, key, requestHash }).onConflictDoNothing()
        .returning();
      return rows.length > 0;
    },
    async get(userId: string, key: string): Promise<StoredRequest | undefined> {
      const [row] = await db.select().from(idempotencyKeys).where(mine(userId, key));
      return row;
    },
    async finish(userId: string, key: string, status: number, body: string) {
      await db.update(idempotencyKeys).set({ status, body }).where(mine(userId, key));
    },
    async release(userId: string, key: string) {
      await db.delete(idempotencyKeys).where(mine(userId, key));
    },
  };
};
