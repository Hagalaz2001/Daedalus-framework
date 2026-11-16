import { assert, assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { createTestApp } from "../../../shared/testing.ts";
import { notes } from "../schema.ts";

const t = await createTestApp();
const ana = await t.signUp("ana");
const ben = await t.signUp("ben");

const post = (headers: HeadersInit, text: string) =>
  t.app.request("/notes", { method: "POST", headers, body: JSON.stringify({ text }) });

Deno.test("notes need a signed-in user and answer with problem+json", async () => {
  const res = await t.app.request("/notes");
  assertEquals(res.status, 401);
  assertEquals(res.headers.get("content-type"), "application/problem+json");
  assertEquals(
    t.deps.contract.validateResponse("GET", "/notes", 401, await res.json(), "application/problem+json"),
    [],
  );
});

Deno.test("create, read, update and soft-delete a note; responses match the contract", async () => {
  const created = await post(ana.headers, "  first note  ");
  assertEquals(created.status, 201);
  const note = await created.json();
  assertEquals(note.text, "first note");
  assertEquals(t.deps.contract.validateResponse("POST", "/notes", 201, note), []);

  const one = await t.app.request(`/notes/${note.id}`, { headers: ana.headers });
  assertEquals(one.status, 200);

  const patched = await t.app.request(`/notes/${note.id}`, {
    method: "PATCH",
    headers: ana.headers,
    body: JSON.stringify({ text: "edited" }),
  });
  assertEquals((await patched.json()).text, "edited");

  assertEquals((await t.app.request(`/notes/${note.id}`, { method: "DELETE", headers: ana.headers })).status, 204);
  assertEquals((await t.app.request(`/notes/${note.id}`, { headers: ana.headers })).status, 404);
  const [row] = await t.db.select().from(notes).where(eq(notes.id, note.id));
  assert(row?.deletedAt, "soft delete keeps the row");
});

Deno.test("tenants are isolated", async () => {
  const note = await (await post(ana.headers, "ana only")).json();
  assertEquals(await (await t.app.request("/notes", { headers: ben.headers })).json(), []);
  assertEquals((await t.app.request(`/notes/${note.id}`, { headers: ben.headers })).status, 404);

  const anaOrg = (await (await t.app.request("/me", { headers: ana.headers })).json()).organizations[0].id;
  const res = await t.app.request("/notes", { headers: { ...ben.headers, "x-organization-id": anaOrg } });
  assertEquals(res.status, 403);
});

Deno.test("invalid input is a 400 problem with field errors", async () => {
  const empty = await post(ana.headers, "");
  assertEquals(empty.status, 400);
  const body = await empty.json();
  assertEquals(body.title, "Bad Request");
  assert(body.errors.length > 0 && body.requestId);
  assertEquals((await t.app.request("/notes?limit=500", { headers: ana.headers })).status, 400);
});

Deno.test("keyset pagination returns pages via X-Next-Cursor", async () => {
  const c = await t.signUp("pager");
  for (const text of ["a", "b", "c", "d", "e"]) await post(c.headers, text);
  const first = await t.app.request("/notes?limit=2", { headers: c.headers });
  assertEquals((await first.json()).map((n: { text: string }) => n.text), ["e", "d"]);
  const cursor = first.headers.get("x-next-cursor");
  assert(cursor);
  const second = await t.app.request(`/notes?limit=2&cursor=${cursor}`, { headers: c.headers });
  assertEquals((await second.json()).map((n: { text: string }) => n.text), ["c", "b"]);
  const last = await t.app.request(`/notes?limit=2&cursor=${second.headers.get("x-next-cursor")}`, {
    headers: c.headers,
  });
  assertEquals((await last.json()).length, 1);
  assertEquals(last.headers.get("x-next-cursor"), null);
  assertEquals((await (await t.app.request("/notes?q=C", { headers: c.headers })).json()).length, 1);
});

Deno.test("Idempotency-Key replays instead of writing twice", async () => {
  const c = await t.signUp("idem");
  const headers = { ...c.headers, "idempotency-key": "key-12345678" };
  const first = await post(headers, "once");
  const again = await post(headers, "once");
  assertEquals(again.status, 201);
  assertEquals(again.headers.get("idempotency-replayed"), "true");
  assertEquals((await again.json()).id, (await first.json()).id);
  assertEquals((await (await t.app.request("/notes", { headers: c.headers })).json()).length, 1);
  assertEquals((await post(headers, "different")).status, 422);
});

Deno.test("a malformed id is a 400 from the contract, not a database error", async () => {
  const res = await t.app.request("/notes/not-a-uuid", { headers: ana.headers });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).errors[0].path, "id");
});

addEventListener("unload", () => void t.close());
