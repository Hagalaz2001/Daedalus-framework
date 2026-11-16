import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/deno";
import { AppError } from "../errors/problem.ts";
import type { AppEnv } from "./types.ts";

/**
 * Fixed-window limiter per client address, kept in memory.
 * shortcut: counters live in this process, so with N instances the real limit is N times higher;
 * move to a shared store (Postgres, Redis) or the platform's edge limiter when you scale out.
 */
export function rateLimit(
  options: { limit: number; windowMs?: number; trustProxy: boolean },
): MiddlewareHandler<AppEnv> {
  const windowMs = options.windowMs ?? 60_000;
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const now = Date.now();
    const forwarded = options.trustProxy ? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
    let key = forwarded;
    if (!key) {
      try {
        key = getConnInfo(c).remote.address;
      } catch {
        key = "local"; // no socket (tests, app.request)
      }
    }
    let entry = hits.get(key ?? "local");
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key ?? "local", entry);
      if (hits.size > 10_000) { for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k); }
    }
    entry.count++;
    c.header("RateLimit-Limit", String(options.limit));
    c.header("RateLimit-Remaining", String(Math.max(0, options.limit - entry.count)));
    if (entry.count > options.limit) {
      const retry = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retry));
      throw new AppError(429, "Too Many Requests", `Rate limit exceeded, retry in ${retry}s`);
    }
    await next();
  };
}
