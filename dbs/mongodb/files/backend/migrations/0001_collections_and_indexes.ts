import type { Db } from "../src/shared/db/client.ts";

/** Creates every collection and the indexes declared in src/shared/db/models.ts (additive: nothing is dropped). */
export async function up(db: Db) {
  for (const model of Object.values(db.models)) {
    await model.createCollection().catch(() => {}); // already exists
    await model.createIndexes();
  }
}
