import type { Db } from "./client.ts";

export interface StoredRequest {
  requestHash: string;
  /** null while the first request is still running. */
  status: number | null;
  body: string | null;
}

/** Storage behind the Idempotency-Key middleware (shared/http/idempotency.ts), MongoDB flavour. */
export const idempotencyStore = (db: Db) => {
  const { IdempotencyKey } = db.models;
  return {
    /** True when this call created the row (it owns the key); false when the key already exists. */
    async claim(userId: string, key: string, requestHash: string): Promise<boolean> {
      try {
        await IdempotencyKey.create({ userId, key, requestHash });
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return false; // duplicate (userId, key)
        throw e;
      }
    },
    async get(userId: string, key: string): Promise<StoredRequest | undefined> {
      const row = await IdempotencyKey.findOne({ userId, key }).lean();
      return row ? { requestHash: row.requestHash, status: row.status ?? null, body: row.body ?? null } : undefined;
    },
    async finish(userId: string, key: string, status: number, body: string) {
      await IdempotencyKey.updateOne({ userId, key }, { $set: { status, body } });
    },
    async release(userId: string, key: string) {
      await IdempotencyKey.deleteOne({ userId, key });
    },
  };
};
