// Only for `deno task db:auth-schema`: lets Better Auth's CLI read the auth config, including the plugins that
// installed modules contribute, so the generated tables match what the backend runs.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { discoverModules, mergeAuthOptions } from "./src/shared/http/modules.ts";
import { loadConfig } from "./src/shared/config/config.ts";
import { createAuth } from "./src/shared/auth/auth.ts";
import { silentLogger } from "./src/shared/logging/logger.ts";

const base = { config: loadConfig({}), db: drizzle(new PGlite("memory://")) as never, logger: silentLogger };
const modules = await discoverModules();
export const auth = createAuth(base, mergeAuthOptions(modules.flatMap((m) => m.auth?.(base) ?? [])));
