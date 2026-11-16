import { assert, assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";

const t = await createTestApp({ ADMIN_EMAILS: "root@example.com" });
const root = await t.signUp("root");
const user = await t.signUp("plain");

await t.app.request("/notes", { method: "POST", headers: user.headers, body: JSON.stringify({ text: "alpha note" }) });
await t.app.request("/notes", { method: "POST", headers: user.headers, body: JSON.stringify({ text: "beta note" }) });

Deno.test("administrators only", async () => {
  assertEquals((await t.app.request("/admin/resources")).status, 401);
  assertEquals((await t.app.request("/admin/resources", { headers: user.headers })).status, 403);
  assertEquals((await t.app.request("/admin/notes", { headers: user.headers })).status, 403);
});

Deno.test("resource metadata describes the columns", async () => {
  const res = await t.app.request("/admin/resources", { headers: root.headers });
  const body = await res.json();
  assertEquals(t.deps.contract.validateResponse("GET", "/admin/resources", 200, body), []);
  const notes = body.find((r: { name: string }) => r.name === "notes");
  assertEquals(notes.columns.find((c: { name: string }) => c.name === "text"), {
    name: "text",
    type: "string",
    nullable: false,
    editable: true,
  });
  assertEquals(notes.columns.find((c: { name: string }) => c.name === "organizationId").editable, false);
});

Deno.test("list with search, read, edit editable columns only, soft-delete", async () => {
  const all = await (await t.app.request("/admin/notes", { headers: root.headers })).json();
  assertEquals(all.length, 2);
  const found = await (await t.app.request("/admin/notes?q=BETA", { headers: root.headers })).json();
  assertEquals(found.map((n: { text: string }) => n.text), ["beta note"]);

  const id = found[0].id;
  const patched = await t.app.request(`/admin/notes/${id}`, {
    method: "PATCH",
    headers: root.headers,
    body: JSON.stringify({ text: "edited by admin" }),
  });
  assertEquals((await patched.json()).text, "edited by admin");
  const denied = await t.app.request(`/admin/notes/${id}`, {
    method: "PATCH",
    headers: root.headers,
    body: JSON.stringify({ organizationId: "x" }),
  });
  assertEquals(denied.status, 400);

  assertEquals((await t.app.request(`/admin/notes/${id}`, { method: "DELETE", headers: root.headers })).status, 204);
  assertEquals((await t.app.request(`/admin/notes/${id}`, { headers: root.headers })).status, 404);
});

Deno.test("unknown resources are 404 and protected ones cannot be deleted", async () => {
  assertEquals((await t.app.request("/admin/sessions", { headers: root.headers })).status, 404);
  const users = await (await t.app.request("/admin/users", { headers: root.headers })).json();
  assert(users.length >= 2);
  assertEquals(
    (await t.app.request(`/admin/users/${users[0].id}`, { method: "DELETE", headers: root.headers })).status,
    400,
  );
});

addEventListener("unload", () => void t.close());
