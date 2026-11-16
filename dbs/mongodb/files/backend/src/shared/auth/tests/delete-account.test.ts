import { assertEquals } from "@std/assert";
import { uuidv7 } from "../../db/columns.ts";
import { createTestApp } from "../../testing.ts";

const t = await createTestApp();

Deno.test("deleting an account removes the user, their personal space and its notes, but not shared organizations", async () => {
  const leaver = await t.signUp("leaver");
  const stayer = await t.signUp("stayer");
  const meOf = async (h: HeadersInit) => await (await t.app.request("/me", { headers: h })).json();
  const leaverMe = await meOf(leaver.headers);
  const stayerMe = await meOf(stayer.headers);
  const m = t.db.models;

  await t.app.request("/notes", { method: "POST", headers: leaver.headers, body: JSON.stringify({ text: "mine" }) });
  // A shared organization both belong to keeps its notes after one member leaves.
  const sharedId = uuidv7();
  await m.Organization.create({
    _id: sharedId,
    name: "Shared",
    slug: `shared-${sharedId.slice(-8)}`,
    createdAt: new Date(),
  });
  await t.addMember(sharedId, leaverMe.id, "member");
  await t.addMember(sharedId, stayerMe.id, "member");
  const shared = { ...stayer.headers, "x-organization-id": sharedId };
  await t.app.request("/notes", { method: "POST", headers: shared, body: JSON.stringify({ text: "team note" }) });
  await t.app.request("/notes", {
    method: "POST",
    headers: { ...leaver.headers, "x-organization-id": sharedId },
    body: JSON.stringify({ text: "leaver wrote this in the team space" }),
  });

  const res = await t.app.request("/api/auth/delete-user", {
    method: "POST",
    headers: leaver.headers,
    body: JSON.stringify({ password: "correct-horse-battery" }),
  });
  assertEquals(res.status, 200, await res.clone().text());

  const personal = leaverMe.organizations[0].id;
  assertEquals(await m.User.countDocuments({ _id: leaverMe.id }), 0);
  assertEquals(await m.Organization.countDocuments({ _id: personal }), 0);
  assertEquals(await m.Note.countDocuments({ organizationId: personal }), 0);
  assertEquals(await m.Member.countDocuments({ userId: leaverMe.id }), 0);
  // The shared space keeps both notes; the leaver's authorship is cleared.
  assertEquals(await m.Note.countDocuments({ organizationId: sharedId }), 2);
  assertEquals(await m.Note.countDocuments({ authorId: leaverMe.id }), 0);
  assertEquals((await t.app.request("/notes", { headers: shared })).status, 200);
});

addEventListener("unload", () => void t.close());
