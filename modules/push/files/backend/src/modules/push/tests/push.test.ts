import { assertEquals } from "@std/assert";
import { count, eq } from "drizzle-orm";
import { createTestApp } from "../../../shared/testing.ts";
import { sendPush } from "../mod.ts";
import { pushTokens } from "../schema.ts";

const t = await createTestApp();
const user = await t.signUp("phone");
const userId = (await (await t.app.request("/me", { headers: user.headers })).json()).id;

const register = (platform: string, token: string, headers: HeadersInit = user.headers) =>
  t.app.request("/push/tokens", { method: "PUT", headers, body: JSON.stringify({ platform, token }) });

Deno.test("devices register and unregister; a token moves to the latest user", async () => {
  const res = await register("expo", "ExponentPushToken[abc12345]");
  assertEquals(res.status, 200);
  const { id } = await res.json();
  const other = await t.signUp("tablet");
  assertEquals((await register("expo", "ExponentPushToken[abc12345]", other.headers)).status, 200);
  assertEquals((await t.app.request(`/push/tokens/${id}`, { method: "DELETE", headers: user.headers })).status, 404);
  assertEquals((await t.app.request(`/push/tokens/${id}`, { method: "DELETE", headers: other.headers })).status, 204);
  assertEquals((await register("sms", "whatever-token")).status, 400);
});

Deno.test("sendPush delivers to each device and removes dead tokens", async () => {
  await register("expo", "ExponentPushToken[live0001]");
  await register("expo", "ExponentPushToken[dead0001]");
  const sent: string[] = [];
  const delivered = await sendPush(t.db, userId, { title: "Hi" }, {
    expo: (token) => (sent.push(token), Promise.resolve(token.includes("dead") ? "gone" : "sent")),
    fcm: () => Promise.reject(new Error("unused")),
    web: () => Promise.reject(new Error("unused")),
  });
  assertEquals(delivered, 1);
  assertEquals(sent.length, 2);
  const left = await t.db.select({ n: count() }).from(pushTokens).where(eq(pushTokens.userId, userId));
  assertEquals(left[0]?.n, 1);
});

addEventListener("unload", () => void t.close());
