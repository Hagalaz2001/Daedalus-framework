import { and, eq, ilike, isNull } from "drizzle-orm";
import type { Db } from "../../shared/db/client.ts";
import { keyset } from "../../shared/http/pagination.ts";
import { type NoteRow, notes } from "./schema.ts";

// Data access only: SQL lives here, never in routes. Every function takes the organization id and filters by it,
// so a handler cannot read or write another tenant's rows by forgetting a condition.

const live = (organizationId: string) => and(eq(notes.organizationId, organizationId), isNull(notes.deletedAt));

export async function list(
  db: Db,
  organizationId: string,
  opts: { limit: number; cursor?: string; q?: string },
): Promise<NoteRow[]> {
  const page = keyset(notes.id, opts.cursor);
  return await db.select().from(notes)
    .where(
      and(
        live(organizationId),
        page.where,
        opts.q ? ilike(notes.text, `%${opts.q.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
      ),
    )
    .orderBy(page.order)
    .limit(opts.limit + 1);
}

export async function find(db: Db, organizationId: string, id: string): Promise<NoteRow | undefined> {
  const [row] = await db.select().from(notes).where(and(live(organizationId), eq(notes.id, id)));
  return row;
}

export async function insert(db: Db, organizationId: string, authorId: string, text: string): Promise<NoteRow> {
  const [row] = await db.insert(notes).values({ organizationId, authorId, text }).returning();
  return row!;
}

export async function update(db: Db, organizationId: string, id: string, text: string): Promise<NoteRow | undefined> {
  const [row] = await db.update(notes).set({ text }).where(and(live(organizationId), eq(notes.id, id))).returning();
  return row;
}

export async function softDelete(db: Db, organizationId: string, id: string): Promise<boolean> {
  const rows = await db.update(notes).set({ deletedAt: new Date() }).where(and(live(organizationId), eq(notes.id, id)))
    .returning({ id: notes.id });
  return rows.length > 0;
}
