import { createApp, discoverModules } from "./app.ts";
import { ConfigError, loadConfig } from "./shared/config/config.ts";
import { openDb } from "./shared/db/client.ts";
import { createLogger } from "./shared/logging/logger.ts";

let config;
try {
  config = loadConfig();
} catch (e) {
  if (!(e instanceof ConfigError)) throw e;
  console.error(e.message);
  Deno.exit(1);
}
const logger = createLogger(config.logLevel);
const { db, close } = await openDb({ url: config.databaseUrl, dataDir: config.pgliteDir });
const modules = await discoverModules();
const { app, deps } = await createApp({ config, db, logger }, modules);

const server = Deno.serve({
  port: config.port,
  onListen: ({ port }) =>
    logger.info("listening", {
      url: `http://localhost:${port}`,
      database: config.databaseUrl ? "postgres" : `pglite (${config.pgliteDir})`,
      modules: modules.map((m) => m.name),
    }),
}, app.fetch);

for (const m of modules) await m.start?.(deps);

// Graceful shutdown: stop accepting, let in-flight requests finish, stop workers, close the database.
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info("shutting down", { signal });
  const force = setTimeout(() => Deno.exit(1), 10_000);
  await server.shutdown();
  for (const m of modules) await m.stop?.();
  await close();
  clearTimeout(force);
  Deno.exit(0);
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  try {
    Deno.addSignalListener(signal, () => void shutdown(signal));
  } catch {
    // SIGTERM is not available on Windows.
  }
}
