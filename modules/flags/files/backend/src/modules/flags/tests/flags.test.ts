import { assert, assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";
import { evaluate } from "../service.ts";

const t = await createTestApp({ ADMIN_EMAILS: "flagadmin@example.com" });
const admin = await t.signUp("flagadmin");
const user = await t.signUp("flaguser");

const put = (headers: HeadersInit, key: string, body: object) =>
  t.app.request(`/flags/${key}`, { method: "PUT", headers, body: JSON.stringify(body) });

Deno.test("only platform administrators change flags", async () => {
  assertEquals((await put(user.headers, "new-ui", { enabled: true })).status, 403);
  const res = await put(admin.headers, "new-ui", { enabled: true, description: "Redesign" });
  assertEquals(res.status, 200);
  assertEquals(t.deps.contract.validateResponse("PUT", "/flags/{key}", 200, await res.json()), []);
});

Deno.test("users see flags evaluated for them", async () => {
  await put(admin.headers, "beta", { enabled: false });
  const body = await (await t.app.request("/flags", { headers: user.headers })).json();
  assertEquals(body.flags["new-ui"], true);
  assertEquals(body.flags["beta"], false);
  assertEquals(t.deps.contract.validateResponse("GET", "/flags", 200, body), []);
  assertEquals((await t.app.request("/flags")).status, 401);
});

Deno.test("flag keys are validated by the contract", async () => {
  assertEquals((await put(admin.headers, "Bad_Key", { enabled: true })).status, 400); // path pattern from the contract
  assertEquals((await put(admin.headers, "ok-key", { enabled: "yes" })).status, 400);
});

Deno.test("percentage rollouts are stable and roughly proportional", () => {
  const flag = { key: "half", enabled: true, rolloutPercent: 50 };
  const users = Array.from({ length: 400 }, (_, i) => `user-${i}`);
  const on = users.filter((u) => evaluate(flag, u)).length;
  assert(on > 140 && on < 260, `expected about half, got ${on}`);
  assertEquals(evaluate(flag, "user-7"), evaluate(flag, "user-7"));
  assertEquals(evaluate({ ...flag, rolloutPercent: 0 }, "user-1"), false);
  assertEquals(evaluate({ ...flag, enabled: false, rolloutPercent: 100 }, "user-1"), false);
});

addEventListener("unload", () => void t.close());
