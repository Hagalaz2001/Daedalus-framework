import type { Context, MiddlewareHandler } from "hono";
import { forbidden, unauthorized } from "../errors/problem.ts";
import type { Config } from "../config/config.ts";
import type { Db } from "../db/client.ts";
import { findMembership } from "../db/membership.ts";
import type { AppEnv } from "../http/types.ts";
import type { AuthLike, AuthUser } from "./auth.ts";

/** Resolves who is calling (cookie or bearer token) and stores it as `c.get("user")`; null when anonymous. */
export const sessionMiddleware = (auth: AuthLike): MiddlewareHandler<AppEnv> => async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  await next();
};

export function requireUser(c: Context<AppEnv>): AuthUser {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}

export interface Tenant {
  user: AuthUser;
  organizationId: string;
  role: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The organization a request acts in: the `X-Organization-Id` header, or the caller's oldest membership
 * (their personal organization). The caller must be a member, so a guessed id never leaks another tenant's data.
 */
export async function requireTenant(c: Context<AppEnv>, db: Db): Promise<Tenant> {
  const user = requireUser(c);
  const wanted = c.req.header("x-organization-id");
  if (wanted && !UUID.test(wanted)) throw forbidden("X-Organization-Id must be a UUID");
  const row = await findMembership(db, user.id, wanted);
  if (!row) {
    throw forbidden(wanted ? "You are not a member of this organization" : "You do not belong to any organization");
  }
  return { user, ...row };
}

/** Platform operators are named in ADMIN_EMAILS (they run the product, not a single organization). */
export function requirePlatformAdmin(c: Context<AppEnv>, config: Pick<Config, "adminEmails">): AuthUser {
  const user = requireUser(c);
  if (!config.adminEmails.includes(user.email.toLowerCase())) throw forbidden("Platform administrators only");
  return user;
}
