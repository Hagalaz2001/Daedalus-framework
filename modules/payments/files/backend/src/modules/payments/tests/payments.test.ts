import { assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";

Deno.env.set("STRIPE_SECRET_KEY", "sk_test_dummy");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");
const t = await createTestApp();
const user = await t.signUp("buyer");
const orgId = (await (await t.app.request("/me", { headers: user.headers })).json()).organizations[0].id;

/** Stripe's signature scheme: HMAC-SHA256 over "<timestamp>.<payload>" with the endpoint secret. */
async function sign(payload: string, secret: string) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  return `t=${t},v1=${Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const webhook = async (payload: object, secret = "whsec_test_secret") => {
  const body = JSON.stringify(payload);
  const headers = { ...t.json, "stripe-signature": await sign(body, secret) };
  return await t.app.request("/webhooks/stripe", { method: "POST", headers, body });
};

Deno.test("billing starts as none and checkout is unavailable without a price", async () => {
  assertEquals(await (await t.app.request("/billing", { headers: user.headers })).json(), { status: "none" });
  assertEquals((await t.app.request("/billing/checkout", { method: "POST", headers: user.headers })).status, 503);
});

Deno.test("webhook with a bad signature is rejected", async () => {
  const res = await webhook({ id: "evt_1", type: "checkout.session.completed" }, "whsec_wrong");
  assertEquals(res.status, 400);
});

Deno.test("signed events move the organization through checkout, past_due and canceled", async () => {
  const completed = await webhook({
    id: "evt_2",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        object: "checkout.session",
        client_reference_id: orgId,
        customer: "cus_1",
        subscription: "sub_1",
      },
    },
  });
  assertEquals(completed.status, 200);
  assertEquals((await (await t.app.request("/billing", { headers: user.headers })).json()).status, "active");

  await webhook({
    id: "evt_3",
    object: "event",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_1", object: "subscription", customer: "cus_1", status: "past_due" } },
  });
  assertEquals((await (await t.app.request("/billing", { headers: user.headers })).json()).status, "past_due");

  await webhook({
    id: "evt_4",
    object: "event",
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_1", object: "subscription", customer: "cus_1", status: "canceled" } },
  });
  assertEquals((await (await t.app.request("/billing", { headers: user.headers })).json()).status, "canceled");
});

addEventListener("unload", () => void t.close());
