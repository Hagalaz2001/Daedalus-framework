import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { uuidv7 } from "./columns.ts";
import { runMigrations } from "./migrate.ts";
import { buildModels, type Models } from "./models.ts";

export interface Db {
  conn: mongoose.Connection;
  models: Models;
}

/** Cheapest round trip, for the readiness probe. */
export const ping = async (db: Db) => void await db.conn.db!.admin().ping();

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

const dbNameOf = (uri: string) => uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1] ?? "app";

/**
 * The database, with migrations applied.
 * - `url` (MONGODB_URI, or DATABASE_URL): any MongoDB 6+ (Atlas, self-hosted, a Docker container).
 * - otherwise a real `mongod` started and managed by mongodb-memory-server (first run downloads the binary, about
 *   600 MB on Windows, and caches it): `dataDir` keeps data between runs (local development), "memory://" is
 *   throwaway (tests). No MongoDB install needed.
 */
export async function openDb(options: { url?: string; dataDir?: string; dbName?: string } = {}): Promise<DbHandle> {
  let server: MongoMemoryServer | undefined;
  let uri = options.url;
  // The config default points at .data/pglite; the MongoDB flavour keeps its files next to it in .data/mongo.
  const dataDir = (options.dataDir ?? ".data/mongo").replace(/pglite$/, "mongo");
  const persistent = !uri && !dataDir.includes("://");
  if (!uri) {
    if (persistent) mkdirSync(dirname(dataDir), { recursive: true }), mkdirSync(dataDir, { recursive: true });
    server = await MongoMemoryServer.create(
      persistent ? { instance: { dbPath: dataDir, storageEngine: "wiredTiger" } } : {},
    );
    uri = server.getUri();
  }
  const conn = await mongoose.createConnection(uri, { dbName: options.dbName ?? dbNameOf(uri) }).asPromise();
  const db: Db = { conn, models: buildModels(conn) };
  await runMigrations(db);
  return {
    db,
    close: async () => {
      await conn.close();
      await server?.stop({ doCleanup: !persistent });
    },
  };
}

/**
 * A throwaway database. With MONGODB_URI set (a Docker container, Atlas) it uses a uniquely named database there and
 * drops it afterwards; otherwise an in-memory `mongod`.
 */
export async function openTestDb(): Promise<DbHandle> {
  const url = Deno.env.get("MONGODB_URI");
  if (!url) return await openDb({ dataDir: "memory://" });
  const dbName = `test_${uuidv7().replaceAll("-", "").slice(0, 20)}`;
  const handle = await openDb({ url, dbName });
  return {
    db: handle.db,
    close: async () => {
      await handle.db.conn.dropDatabase();
      await handle.close();
    },
  };
}
