import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/deno";
import { AppError } from "../errors/problem.ts";
import type { AppEnv } from "./types.ts";

/**
 * The client address to count requests against. `X-Forwarded-For` is a list the client can start with any values; every
 * trusted proxy appends the address it saw. With `trustedHops` proxies in front of the app, the real client is
 * `trustedHops` entries from the END of the list: anything left of it is attacker-controlled and ignored.
 * Without trusted hops, or when the header is shorter than the hop count, the socket address is used.
 */
export function clientKey(forwardedFor: string | undefined, trustedHops: number, socket: string | undefined): string {
  if (trustedHops > 0 && forwardedFor) {
    const chain = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    const hit = chain[chain.length - trustedHops];
    if (hit && chain.length >= trustedHops) return hit;
  }
  return socket ?? "local"; // "local": no socket (tests, app.request)
}

/**
 * Fixed-window limiter per client address, kept in memory.
 * shortcut: counters live in this process, so with N instances the real limit is N times higher;
 * move to a shared store (Postgres, Redis) or the platform's edge limiter when you scale out.
 */
export function rateLimit(
  options: {
    limit: number;
    windowMs?: number; /** Number of reverse proxies you control in front of the app (0 = none). */
    trustProxy: number;
  },
): MiddlewareHandler<AppEnv> {
  const windowMs = options.windowMs ?? 60_000;
  const MAX_TRACKED = 10_000;
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const now = Date.now();
    let socket: string | undefined;
    try {
      socket = getConnInfo(c).remote.address;
    } catch { /* no socket (tests, app.request) */ }
    const key = clientKey(c.req.header("x-forwarded-for"), options.trustProxy, socket);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
      if (hits.size > MAX_TRACKED) { for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k); }
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
