import { assert } from "@std/assert";
import { sql } from "drizzle-orm";
import { createTestApp } from "../../testing.ts";

const t = await createTestApp();

Deno.test("migrations create the base schema", async () => {
  const rows = await t.db.execute(sql`select table_name from information_schema.tables where table_schema = 'public'`);
  const names = (rows as unknown as { rows: { table_name: string }[] }).rows.map((r) => r.table_name);
  for (
    const table of [
      "user",
      "session",
      "organization",
      "member",
      "invitation",
      "audit_log",
      "files",
      "notifications",
      "notes",
    ]
  ) {
    assert(names.includes(table), `missing table ${table}`);
  }
});

addEventListener("unload", () => void t.close());
