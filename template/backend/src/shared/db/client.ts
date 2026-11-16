import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export type Db = PgDatabase<PgQueryResultHKT>;

const migrationsFolder = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/** Cheapest round trip, for the readiness probe. */
export const ping = async (db: Db) => void await db.execute(sql`select 1`);

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

/**
 * The database, migrated to the latest schema.
 * - `url` (DATABASE_URL): any Postgres 15+ (Supabase, Neon, self-hosted). Use the pooler URL in production.
 * - otherwise PGlite, Postgres compiled to WASM running in this process: `dataDir` keeps data between runs,
 *   "memory://" is a throwaway database (tests). Nothing to install.
 */
export async function openDb(options: { url?: string; dataDir?: string } = {}): Promise<DbHandle> {
  if (options.url) {
    const sql = postgres(options.url, { prepare: false, max: 10 });
    const db = drizzlePostgres(sql);
    await migratePostgres(db, { migrationsFolder });
    return { db: db as unknown as Db, close: () => sql.end() };
  }
  const dataDir = options.dataDir ?? ".data/pglite";
  // PGlite creates its folder but not the parents.
  if (!dataDir.includes("://")) mkdirSync(dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client);
  await migratePglite(db, { migrationsFolder });
  return { db: db as unknown as Db, close: () => client.close() };
}

/** A throwaway in-memory database with all migrations applied. */
export const openTestDb = () => openDb({ dataDir: "memory://" });
