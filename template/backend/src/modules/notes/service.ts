import type { Schemas } from "@app/api";
import type { Db } from "../../shared/db/client.ts";
import { notFound } from "../../shared/errors/problem.ts";
import { slicePage } from "../../shared/http/pagination.ts";
import * as repo from "./repository.ts";
import type { NoteRow } from "./repository.ts";

// API shapes come from contracts/openapi.yaml through `deno task sync`; never hand-write them.
export type Note = Schemas["Note"];

const toNote = (row: NoteRow): Note => ({ id: row.id, text: row.text, createdAt: row.createdAt.toISOString() });

// Business rules live here (permissions beyond tenancy, limits, side effects). Routes only translate HTTP.
export const notesService = (db: Db) => ({
  async list(organizationId: string, opts: { limit: number; cursor?: string; q?: string }) {
    const { items, nextCursor } = slicePage(await repo.list(db, organizationId, opts), opts.limit);
    return { notes: items.map(toNote), nextCursor };
  },
  async get(organizationId: string, id: string): Promise<Note> {
    const row = await repo.find(db, organizationId, id);
    if (!row) throw notFound("Note not found");
    return toNote(row);
  },
  async create(organizationId: string, authorId: string, text: string): Promise<Note> {
    return toNote(await repo.insert(db, organizationId, authorId, text.trim()));
  },
  async update(organizationId: string, id: string, text: string): Promise<Note> {
    const row = await repo.update(db, organizationId, id, text.trim());
    if (!row) throw notFound("Note not found");
    return toNote(row);
  },
  async remove(organizationId: string, id: string): Promise<void> {
    if (!(await repo.softDelete(db, organizationId, id))) throw notFound("Note not found");
  },
});
