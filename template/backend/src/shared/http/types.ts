import type { Hono, MiddlewareHandler } from "hono";
import type { BetterAuthOptions } from "better-auth";
import type { AuthLike, AuthUser } from "../auth/auth.ts";
import type { Config } from "../config/config.ts";
import type { Db } from "../db/client.ts";
import type { Logger } from "../logging/logger.ts";
import type { Contract } from "../validation/contract.ts";

export type AppEnv = {
  Variables: {
    requestId: string;
    user: AuthUser | null;
    /** Validated JSON body / query string, set by the contract middleware for operations that declare them. */
    body: unknown;
    query: Record<string, unknown>;
  };
};

export type App = Hono<AppEnv>;

export interface Deps {
  config: Config;
  db: Db;
  logger: Logger;
  auth: AuthLike;
  contract: Contract;
}

/** What `src/modules/<name>/mod.ts` default-exports. Everything is optional; copy a folder in and it is picked up. */
export interface Module {
  name: string;
  /** Runs once at boot, before Better Auth is built (install a mailer, read env, start an SDK). */
  setup?: (base: Pick<Deps, "config" | "db" | "logger">) => void;
  /** Contributes Better Auth plugins/options (OAuth, magic link, 2FA, email sending...). */
  auth?: (base: Pick<Deps, "config" | "db" | "logger">) => Partial<BetterAuthOptions>;
  /** Global middleware, installed before any route (audit, metrics...). */
  middleware?: (deps: Deps) => MiddlewareHandler<AppEnv>[];
  routes?: (deps: Deps) => App;
  /** Background work that starts after the server is up and stops on shutdown (job workers, realtime). */
  start?: (deps: Deps) => Promise<void>;
  stop?: () => Promise<void>;
}
