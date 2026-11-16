import { and, eq, getTableColumns, ilike, isNull, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { requirePlatformAdmin } from "../../shared/auth/session.ts";
import { badRequest, notFound } from "../../shared/errors/problem.ts";
import { keyset } from "../../shared/db/keyset.ts";
import { pageParams, slicePage } from "../../shared/http/pagination.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { describe, type Resource, resources } from "./resources.ts";

const find = (name: string): Resource =>
  resources.find((r) => r.name === name) ?? (() => {
    throw notFound(`Unknown resource "${name}"`);
  })();

const columnsOf = (r: Resource) => getTableColumns(r.table) as Record<string, PgColumn>;
const liveOnly = (r: Resource) => {
  const deletedAt = columnsOf(r)["deletedAt"];
  return deletedAt ? isNull(deletedAt) : undefined;
};

export default {
  name: "admin",
  routes: ({ db, config }) => {
    const app = new Hono<AppEnv>();
    // Every admin route: platform administrators only (ADMIN_EMAILS).
    app.use("/admin/*", async (c, next) => (requirePlatformAdmin(c, config), await next()));

    app.get("/admin/resources", (c) => c.json(resources.map(describe)));

    app.get("/admin/:resource", async (c) => {
      const r = find(c.req.param("resource"));
      const q = c.get("query")["q"] as string | undefined;
      const { limit, cursor } = pageParams(c.get("query"));
      const page = keyset(r.table.id, cursor);
      const text = Object.values(columnsOf(r)).filter((col) => col.dataType === "string" && col.name !== "id");
      const search = q && text.length
        ? or(...text.map((col) => ilike(col, `%${q.replace(/[%_\\]/g, "\\$&")}%`)))
        : undefined;
      const rows = await db.select().from(r.table).where(and(liveOnly(r), page.where, search)).orderBy(page.order)
        .limit(limit + 1) as { id: string }[];
      const { items, nextCursor } = slicePage(rows, limit);
      if (nextCursor) c.header("X-Next-Cursor", nextCursor);
      return c.json(items);
    });

    const one = async (name: string, id: string) => {
      const r = find(name);
      const [row] = await db.select().from(r.table).where(and(eq(r.table.id, id), liveOnly(r)));
      if (!row) throw notFound("Row not found");
      return { r, row };
    };

    app.get("/admin/:resource/:id", async (c) => c.json((await one(c.req.param("resource"), c.req.param("id"))).row));

    app.patch("/admin/:resource/:id", async (c) => {
      const { r } = await one(c.req.param("resource"), c.req.param("id"));
      const body = c.get("body") as Record<string, unknown>;
      const rejected = Object.keys(body).filter((k) => !r.editable.includes(k));
      if (rejected.length || !Object.keys(body).length) {
        throw badRequest(
          `Editable columns of ${r.name}: ${r.editable.join(", ")}`,
          rejected.map((path) => ({ path, message: "not editable" })),
        );
      }
      const [row] = await db.update(r.table).set(body).where(eq(r.table.id, c.req.param("id"))).returning();
      return c.json(row);
    });

    app.delete("/admin/:resource/:id", async (c) => {
      const { r } = await one(c.req.param("resource"), c.req.param("id"));
      if (!r.deletable) throw badRequest(`${r.label} cannot be deleted from the admin panel`);
      const where = eq(r.table.id, c.req.param("id"));
      if (columnsOf(r)["deletedAt"]) await db.update(r.table).set({ deletedAt: new Date() }).where(where);
      else await db.delete(r.table).where(where);
      return c.body(null, 204);
    });

    return app;
  },
} satisfies Module;
