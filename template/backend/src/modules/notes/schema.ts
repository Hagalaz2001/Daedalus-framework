import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, deletedAt, id, updatedAt } from "../../shared/db/columns.ts";
import { organization, user } from "../../shared/db/auth-schema.ts";

/**
 * The example feature table. Pattern to copy: UUIDv7 id, `organization_id` (tenant) on every row,
 * the author as a nullable FK (deleting a user keeps the organization's content), timestamps, soft delete.
 */
export const notes = pgTable("notes", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
}, (t) => [index("notes_org_idx").on(t.organizationId, t.id)]);

export type NoteRow = typeof notes.$inferSelect;
