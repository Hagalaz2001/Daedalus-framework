import { getTableColumns } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { user } from "../../shared/db/auth-schema.ts";
import { notes } from "../notes/schema.ts";

export interface Resource {
  name: string;
  label: string;
  table: PgTable & { id: PgColumn };
  /** Columns an administrator may change; everything else is shown read-only. */
  editable: string[];
  deletable: boolean;
}

/**
 * The tables the panel manages. To add one, append an entry: the API and the React screen build themselves from the
 * Drizzle columns. Keep sensitive tables (sessions, accounts, tokens) out of this list.
 */
export const resources: Resource[] = [
  { name: "notes", label: "Notes", table: notes, editable: ["text"], deletable: true },
  { name: "users", label: "Users", table: user, editable: ["name"], deletable: false },
];

const kind = (dataType: string) => (["string", "number", "boolean", "date"].includes(dataType) ? dataType : "json");

export const describe = (r: Resource) => ({
  name: r.name,
  label: r.label,
  deletable: r.deletable,
  columns: Object.entries(getTableColumns(r.table)).map(([name, col]) => ({
    name,
    type: kind((col as PgColumn).dataType),
    nullable: !(col as PgColumn).notNull,
    editable: r.editable.includes(name),
  })),
});
