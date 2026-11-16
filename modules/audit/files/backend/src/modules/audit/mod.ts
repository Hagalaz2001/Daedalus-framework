import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireTenant } from "../../shared/auth/session.ts";
import type { Db } from "../../shared/db/client.ts";
import { auditLog } from "../../shared/db/schema.ts";
import { forbidden } from "../../shared/errors/problem.ts";
import { keyset, pageParams, slicePage } from "../../shared/http/pagination.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { Contract } from "../../shared/validation/contract.ts";

type Entry = typeof auditLog.$inferInsert;

/** Explicit events from services (`member.remove`, `plan.change`); successful writes are recorded automatically. */
export const record = (db: Db, entry: Entry) => db.insert(auditLog).values(entry);

export default {
  name: "audit",
  middleware: (deps) => [
    async (c, next) => {
      await next();
      const op = deps.contract.operationOf(c);
      const user = c.get("user");
      if (!user || !op || c.req.method === "GET" || c.res.status >= 400) return;
      const { path, pattern } = op;
      try {
        const tenant = await requireTenant(c, deps.db).catch(() => null);
        await record(deps.db, {
          organizationId: tenant?.organizationId,
          actorId: user.id,
          action: `${c.req.method} ${path}`,
          entityType: path.split("/")[1],
          entityId: Contract.pathParams(pattern, new URL(c.req.url).pathname)["id"],
          requestId: c.get("requestId"),
        });
      } catch (e) {
        // Never fail a request that already succeeded because its audit row could not be written.
        deps.logger.error("audit write failed", { requestId: c.get("requestId"), error: String(e) });
      }
    },
  ],
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/audit-log", async (c) => {
      const tenant = await requireTenant(c, db);
      if (!["owner", "admin"].includes(tenant.role)) throw forbidden("Only owners and admins can read the audit log");
      const { limit, cursor } = pageParams(c.get("query"));
      const page = keyset(auditLog.id, cursor);
      const rows = await db.select().from(auditLog)
        .where(and(eq(auditLog.organizationId, tenant.organizationId), page.where))
        .orderBy(page.order)
        .limit(limit + 1);
      const { items, nextCursor } = slicePage(rows, limit);
      if (nextCursor) c.header("X-Next-Cursor", nextCursor);
      return c.json(items.map((r) => ({
        id: r.id,
        action: r.action,
        actorId: r.actorId ?? undefined,
        entityType: r.entityType ?? undefined,
        entityId: r.entityId ?? undefined,
        requestId: r.requestId ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })));
    }),
} satisfies Module;
