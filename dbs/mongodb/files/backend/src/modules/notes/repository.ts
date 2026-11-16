import type { Db } from "../../shared/db/client.ts";

// Data access only (MongoDB flavour). Every function takes the organization id and filters by it, so a handler cannot
// read or write another tenant's documents by forgetting a condition. Same function names and shapes as the SQL flavour.

export interface NoteRow {
  id: string;
  organizationId: string;
  authorId: string | null;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const live = (organizationId: string) => ({ organizationId, deletedAt: null });
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Doc = { _id: unknown } & Omit<NoteRow, "id">;
const toRow = (d: Doc): NoteRow => ({ ...d, id: String(d._id) });

export async function list(
  db: Db,
  organizationId: string,
  opts: { limit: number; cursor?: string; q?: string },
): Promise<NoteRow[]> {
  const docs = await db.models.Note.find({
    ...live(organizationId),
    ...(opts.cursor ? { _id: { $lt: opts.cursor } } : {}),
    ...(opts.q ? { text: { $regex: escapeRegex(opts.q), $options: "i" } } : {}),
  }).sort({ _id: -1 }).limit(opts.limit + 1).lean();
  return docs.map((d) => toRow(d as unknown as Doc));
}

/** Including soft-deleted rows: for tests and admin tools, never for request handling. */
export async function rawGet(db: Db, id: string): Promise<NoteRow | undefined> {
  const d = await db.models.Note.findById(id).lean();
  return d ? toRow(d as unknown as Doc) : undefined;
}

export async function find(db: Db, organizationId: string, id: string): Promise<NoteRow | undefined> {
  const d = await db.models.Note.findOne({ ...live(organizationId), _id: id }).lean();
  return d ? toRow(d as unknown as Doc) : undefined;
}

export async function insert(db: Db, organizationId: string, authorId: string, text: string): Promise<NoteRow> {
  const d = await db.models.Note.create({ organizationId, authorId, text });
  return toRow(d.toObject() as unknown as Doc);
}

export async function update(db: Db, organizationId: string, id: string, text: string): Promise<NoteRow | undefined> {
  const d = await db.models.Note.findOneAndUpdate({ ...live(organizationId), _id: id }, { $set: { text } }, {
    returnDocument: "after",
  })
    .lean();
  return d ? toRow(d as unknown as Doc) : undefined;
}

export async function softDelete(db: Db, organizationId: string, id: string): Promise<boolean> {
  const r = await db.models.Note.updateOne({ ...live(organizationId), _id: id }, { $set: { deletedAt: new Date() } });
  return r.modifiedCount > 0;
}
