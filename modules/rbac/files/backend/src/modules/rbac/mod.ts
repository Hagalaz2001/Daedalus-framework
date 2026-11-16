import { Hono } from "hono";
import type { Context } from "hono";
import { requireTenant } from "../../shared/auth/session.ts";
import type { Db } from "../../shared/db/client.ts";
import { forbidden } from "../../shared/errors/problem.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { can, type Permission, permissionsFor } from "./policy.ts";

/** Which permission an API operation needs. Operations not listed here only need a signed-in organization member. */
export const operationPermissions: Record<string, Permission> = {
  "POST /notes": "note:create",
  "PATCH /notes/{id}": "note:update",
  "DELETE /notes/{id}": "note:delete",
};

/** For routes you write yourself: `const tenant = await requirePermission(c, db, "member:invite")`. */
export async function requirePermission(c: Context<AppEnv>, db: Db, permission: Permission) {
  const tenant = await requireTenant(c, db);
  if (!can(tenant.role, permission)) throw forbidden(`Your role (${tenant.role}) lacks the "${permission}" permission`);
  return tenant;
}

export default {
  name: "rbac",
  middleware: ({ db, contract }) => [
    async (c, next) => {
      const op = contract.operationOf(c);
      const needed = op && operationPermissions[`${c.req.method} ${op.path}`];
      if (needed) await requirePermission(c, db, needed);
      await next();
    },
  ],
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/permissions", async (c) => {
      const { role } = await requireTenant(c, db);
      return c.json({ role, permissions: permissionsFor(role) });
    }),
} satisfies Module;
