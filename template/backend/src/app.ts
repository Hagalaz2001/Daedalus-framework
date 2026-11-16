import { Scalar } from "@scalar/hono-api-reference";
import type { BetterAuthOptions } from "better-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { createAuth } from "./shared/auth/auth.ts";
import { sessionMiddleware } from "./shared/auth/session.ts";
import type { Config } from "./shared/config/config.ts";
import type { Db } from "./shared/db/client.ts";
import { onError, onNotFound } from "./shared/errors/handlers.ts";
import { idempotency } from "./shared/http/idempotency.ts";
import { rateLimit } from "./shared/http/rate-limit.ts";
import type { AppEnv, Deps, Module } from "./shared/http/types.ts";
import { type Logger, requestLogger } from "./shared/logging/logger.ts";
import { Contract, contractMiddleware } from "./shared/validation/contract.ts";

/** Every `src/modules/<name>/mod.ts`: copying a module folder in is all it takes to enable it. */
export async function discoverModules(): Promise<Module[]> {
  const root = new URL("./modules/", import.meta.url);
  const names: string[] = [];
  for await (const entry of Deno.readDir(root)) if (entry.isDirectory) names.push(entry.name);
  const mods = await Promise.all(
    names.sort().map(async (n) => (await import(new URL(`${n}/mod.ts`, root).href)).default as Module),
  );
  return mods;
}

export function mergeAuthOptions(parts: Partial<BetterAuthOptions>[]): Partial<BetterAuthOptions> {
  return parts.reduce<Partial<BetterAuthOptions>>((all, p) => ({
    ...all,
    ...p,
    plugins: [...(all.plugins ?? []), ...(p.plugins ?? [])],
    emailAndPassword: { enabled: true, ...all.emailAndPassword, ...p.emailAndPassword },
  }), {});
}

const apiHeaders = secureHeaders({
  contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
});
// The API reference page loads Scalar's script and styles from jsDelivr.
const docsHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
  },
});

export async function createApp(
  base: { config: Config; db: Db; logger: Logger },
  modules: Module[],
): Promise<{ app: Hono<AppEnv>; deps: Deps }> {
  const { config, db, logger } = base;
  for (const m of modules) m.setup?.(base);
  const auth = createAuth(base, mergeAuthOptions(modules.flatMap((m) => m.auth?.(base) ?? [])));
  const contract = await Contract.load();
  const deps: Deps = { ...base, auth, contract };
  const app = new Hono<AppEnv>();

  app.use("*", requestId());
  app.use("*", requestLogger(logger));
  app.use("*", (c, next) => (c.req.path === "/docs" ? docsHeaders : apiHeaders)(c, next));
  app.use(
    "*",
    cors({
      origin: (origin) => (config.trustedOrigins.includes(origin) ? origin : null),
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Organization-Id", "X-Request-Id"],
      exposeHeaders: ["set-auth-token", "X-Next-Cursor", "X-Request-Id", "Idempotency-Replayed", "Retry-After"],
    }),
  );
  app.use("*", rateLimit({ limit: config.rateLimitPerMinute, trustProxy: config.trustProxy }));

  // Sign up/in/out, sessions, organizations, invitations: Better Auth. Stricter limit against password guessing.
  app.use("/api/auth/*", rateLimit({ limit: 30, trustProxy: config.trustProxy }));
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.get("/openapi.json", (c) => c.json(contract.doc));
  app.get("/docs", Scalar({ url: "/openapi.json", pageTitle: "API reference" }));

  app.use("*", sessionMiddleware(auth));
  app.use("*", idempotency(db));
  app.use("*", contractMiddleware(contract));
  for (const m of modules) for (const mw of m.middleware?.(deps) ?? []) app.use("*", mw);
  for (const m of modules) if (m.routes) app.route("/", m.routes(deps));

  app.notFound(onNotFound);
  app.onError(onError(logger));
  return { app, deps };
}
