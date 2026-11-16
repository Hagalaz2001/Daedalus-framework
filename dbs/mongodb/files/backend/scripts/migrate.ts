// `deno task migrate`: applies pending migrations from backend/migrations/ and lists what has run. (They also run
// automatically when the backend starts, so this is for deploy pipelines that migrate before starting instances.)
import { loadConfig } from "../src/shared/config/config.ts";
import { openDb } from "../src/shared/db/client.ts";

const config = loadConfig();
const { db, close } = await openDb({ url: config.databaseUrl, dataDir: config.pgliteDir });
const ledger = await db.conn.collection("_migrations").find().sort({ _id: 1 }).toArray();
console.log(`Applied migrations: ${ledger.map((m) => String(m._id)).join(", ") || "none"}`);
await close();
