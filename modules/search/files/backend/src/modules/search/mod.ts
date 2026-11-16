import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireTenant } from "../../shared/auth/session.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { notes } from "../notes/schema.ts";

// The 'simple' configuration does no stemming, so it works for any language; pick 'english' (or another) for one.
const vector = sql`to_tsvector('simple', ${notes.text})`;

export default {
  name: "search",
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/search", async (c) => {
      const tenant = await requireTenant(c, db);
      const { q, limit } = c.get("query") as { q: string; limit?: number };
      const query = sql`websearch_to_tsquery('simple', ${q})`;
      const rows = await db
        .select({
          id: notes.id,
          snippet: sql<string>`ts_headline('simple', ${notes.text}, ${query}, 'StartSel=<b>,StopSel=</b>')`,
          rank: sql<number>`ts_rank(${vector}, ${query})`,
        })
        .from(notes)
        .where(
          and(eq(notes.organizationId, tenant.organizationId), isNull(notes.deletedAt), sql`${vector} @@ ${query}`),
        )
        .orderBy((t) => desc(t.rank))
        .limit(limit ?? 10);
      return c.json(rows.map((r) => ({ ...r, kind: "note" as const })));
    }),
} satisfies Module;
