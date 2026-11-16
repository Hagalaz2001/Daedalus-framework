import { assert, assertEquals } from "@std/assert";
import { createTestApp } from "../../testing.ts";

const t = await createTestApp();

Deno.test("migrations create the collections and the declared indexes", async () => {
  const names = (await t.db.conn.db!.listCollections().toArray()).map((c) => c.name);
  for (
    const c of [
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
    assert(names.includes(c), `missing collection ${c}`);
  }
  const memberIndexes = await t.db.models.Member.collection.indexes();
  assert(
    memberIndexes.some((i) => i.unique && i.key["organizationId"] === 1 && i.key["userId"] === 1),
    "unique membership",
  );
  const notesIndexes = await t.db.models.Note.collection.indexes();
  assert(notesIndexes.some((i) => i.key["organizationId"] === 1 && i.key["_id"] === -1), "tenant list index");
  const ledger = await t.db.conn.collection("_migrations").find().toArray();
  assertEquals(ledger.map((m) => String(m._id)), ["0001_collections_and_indexes.ts"]);
});

addEventListener("unload", () => void t.close());
