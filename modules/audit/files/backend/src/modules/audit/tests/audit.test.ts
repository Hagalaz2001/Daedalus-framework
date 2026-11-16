import { assert, assertEquals } from "@std/assert";
import { member } from "../../../shared/db/auth-schema.ts";
import { uuidv7 } from "../../../shared/db/columns.ts";
import { createTestApp } from "../../../shared/testing.ts";

const t = await createTestApp();
const owner = await t.signUp("auditor");
const colleague = await t.signUp("viewer");

Deno.test("successful writes are recorded with actor, operation, entity and request id", async () => {
  const created = await t.app.request("/notes", {
    method: "POST",
    headers: owner.headers,
    body: JSON.stringify({ text: "audited" }),
  });
  const note = await created.json();
  await t.app.request(`/notes/${note.id}`, { method: "DELETE", headers: owner.headers });
  await t.app.request("/notes", { method: "POST", headers: owner.headers, body: JSON.stringify({ text: "" }) }); // 400: not recorded

  const res = await t.app.request("/audit-log", { headers: owner.headers });
  assertEquals(res.status, 200);
  const entries = await res.json();
  assertEquals(entries.map((e: { action: string }) => e.action), ["DELETE /notes/{id}", "POST /notes"]);
  assertEquals(entries[0].entityId, note.id);
  assert(entries[0].requestId);
  assertEquals(t.deps.contract.validateResponse("GET", "/audit-log", 200, entries), []);
});

Deno.test("only owners and admins read the log; a plain member gets 403", async () => {
  const orgId = (await (await t.app.request("/me", { headers: owner.headers })).json()).organizations[0].id;
  const id = (await (await t.app.request("/me", { headers: colleague.headers })).json()).id;
  await t.db.insert(member).values({
    id: uuidv7(),
    organizationId: orgId,
    userId: id,
    role: "member",
    createdAt: new Date(),
  });
  const res = await t.app.request("/audit-log", { headers: { ...colleague.headers, "x-organization-id": orgId } });
  assertEquals(res.status, 403);
});

addEventListener("unload", () => void t.close());
