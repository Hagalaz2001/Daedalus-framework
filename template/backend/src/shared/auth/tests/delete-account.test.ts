import { assertEquals } from "@std/assert";
import { count, eq } from "drizzle-orm";
import { member, organization, user } from "../../db/auth-schema.ts";
import { uuidv7 } from "../../db/columns.ts";
import { notes } from "../../../modules/notes/schema.ts";
import { createTestApp } from "../../testing.ts";

const t = await createTestApp();

Deno.test("deleting an account removes the user, their personal space and its notes, but not shared organizations", async () => {
  const leaver = await t.signUp("leaver");
  const stayer = await t.signUp("stayer");
  const meOf = async (h: HeadersInit) => await (await t.app.request("/me", { headers: h })).json();
  const leaverMe = await meOf(leaver.headers);
  const stayerMe = await meOf(stayer.headers);

  await t.app.request("/notes", { method: "POST", headers: leaver.headers, body: JSON.stringify({ text: "mine" }) });
  // A shared organization both belong to keeps its notes after one member leaves.
  const sharedId = uuidv7();
  await t.db.insert(organization).values({
    id: sharedId,
    name: "Shared",
    slug: `shared-${sharedId.slice(-8)}`,
    createdAt: new Date(),
  });
  await t.db.insert(member).values([leaverMe.id, stayerMe.id].map((userId) => ({
    id: uuidv7(),
    organizationId: sharedId,
    userId,
    role: "member",
    createdAt: new Date(),
  })));
  const shared = { ...stayer.headers, "x-organization-id": sharedId };
  await t.app.request("/notes", { method: "POST", headers: shared, body: JSON.stringify({ text: "team note" }) });

  const res = await t.app.request("/api/auth/delete-user", {
    method: "POST",
    headers: leaver.headers,
    body: JSON.stringify({ password: "correct-horse-battery" }),
  });
  assertEquals(res.status, 200, await res.clone().text());

  assertEquals((await t.db.select({ n: count() }).from(user).where(eq(user.id, leaverMe.id)))[0]?.n, 0);
  assertEquals(
    (await t.db.select({ n: count() }).from(organization).where(eq(organization.id, leaverMe.organizations[0].id)))[0]
      ?.n,
    0,
  );
  assertEquals(
    (await t.db.select({ n: count() }).from(notes).where(eq(notes.organizationId, leaverMe.organizations[0].id)))[0]?.n,
    0,
  );
  assertEquals((await t.app.request("/notes", { headers: shared })).status, 200);
  assertEquals((await t.db.select({ n: count() }).from(notes).where(eq(notes.organizationId, sharedId)))[0]?.n, 1);
});

addEventListener("unload", () => void t.close());
