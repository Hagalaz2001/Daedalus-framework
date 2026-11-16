import { assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";
import { track } from "../analytics.ts";

Deno.test("track does nothing without keys and never throws", async () => {
  await track("note_created", "user-1", { length: 3 }, () => undefined);
});

Deno.test("track posts to PostHog and Plausible when configured", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return Promise.resolve(new Response("{}"));
  };
  try {
    const env = (n: string) =>
      ({ POSTHOG_KEY: "phc_x", POSTHOG_HOST: "https://ph.example", PLAUSIBLE_DOMAIN: "example.com" })[n];
    await track("signup", "user-9", { plan: "free" }, env);
  } finally {
    globalThis.fetch = realFetch;
  }
  assertEquals(calls.map((c) => c.url), ["https://ph.example/capture/", "https://plausible.io/api/event"]);
  assertEquals(calls[0]!.body["distinct_id"], "user-9");
});

Deno.test("requests still work with the tracing middleware installed", async () => {
  const t = await createTestApp();
  assertEquals((await t.app.request("/health")).status, 200);
  await t.close();
});
