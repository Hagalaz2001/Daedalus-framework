import { assert, assertEquals } from "@std/assert";
import { member } from "../../../shared/db/auth-schema.ts";
import { uuidv7 } from "../../../shared/db/columns.ts";
import { createTestApp } from "../../../shared/testing.ts";
import { can, permissionsFor } from "../policy.ts";

const t = await createTestApp();
const owner = await t.signUp("owner");
const colleague = await t.signUp("colleague");

// Put the colleague into the owner's organization as a plain member.
const orgId = (await (await t.app.request("/me", { headers: owner.headers })).json()).organizations[0].id;
const colleagueId = (await (await t.app.request("/me", { headers: colleague.headers })).json()).id;
await t.db.insert(member).values({
  id: uuidv7(),
  organizationId: orgId,
  userId: colleagueId,
  role: "member",
  createdAt: new Date(),
});
const asColleague = { ...colleague.headers, "x-organization-id": orgId };

Deno.test("policy: owners and admins manage, members do not delete", () => {
  assert(can("owner", "org:delete"));
  assert(!can("admin", "org:delete"));
  assert(can("admin", "note:delete"));
  assert(!can("member", "note:delete"));
  assert(!permissionsFor("member").includes("note:delete"));
  assert(!can("stranger", "note:read"));
});

Deno.test("routes enforce the policy by role", async () => {
  const created = await t.app.request("/notes", {
    method: "POST",
    headers: asColleague,
    body: JSON.stringify({ text: "written by a member" }),
  });
  assertEquals(created.status, 201);
  const { id } = await created.json();

  const denied = await t.app.request(`/notes/${id}`, { method: "DELETE", headers: asColleague });
  assertEquals(denied.status, 403);
  assertEquals(denied.headers.get("content-type"), "application/problem+json");

  const allowed = await t.app.request(`/notes/${id}`, { method: "DELETE", headers: owner.headers });
  assertEquals(allowed.status, 204);
});

Deno.test("GET /permissions tells the UI what to show", async () => {
  const res = await t.app.request("/permissions", { headers: asColleague });
  const body = await res.json();
  assertEquals(body.role, "member");
  assert(body.permissions.includes("note:create") && !body.permissions.includes("note:delete"));
  assertEquals(t.deps.contract.validateResponse("GET", "/permissions", 200, body), []);
});

addEventListener("unload", () => void t.close());
