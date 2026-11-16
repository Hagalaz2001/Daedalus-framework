import type { Db } from "./client.ts";

/**
 * A small migration runner (MongoDB has no schema to diff). Files in `backend/migrations/` named `NNNN_what.ts` each
 * export `up(db)`; applied names are recorded in the `_migrations` collection and run once, in name order, when the
 * backend starts (and with `deno task --cwd backend migrate`). Migrations must be idempotent: two instances may start
 * at the same moment. Never edit an applied migration; add a new one.
 */
export async function runMigrations(db: Db): Promise<string[]> {
  const dir = new URL("../../../migrations/", import.meta.url);
  const files: string[] = [];
  for await (const e of Deno.readDir(dir)) if (e.isFile && /^\d{4}_.+\.ts$/.test(e.name)) files.push(e.name);
  const ledger = db.conn.collection<{ _id: string; appliedAt: Date }>("_migrations");
  const applied: string[] = [];
  for (const name of files.sort()) {
    if (await ledger.findOne({ _id: name })) continue;
    await (await import(new URL(name, dir).href)).up(db);
    await ledger.updateOne({ _id: name }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
    applied.push(name);
  }
  return applied;
}
