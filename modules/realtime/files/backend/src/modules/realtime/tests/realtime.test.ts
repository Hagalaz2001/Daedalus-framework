import { assert, assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";
import { publish, subscribers } from "../mod.ts";

const t = await createTestApp();
const user = await t.signUp("listener");
const orgId = (await (await t.app.request("/me", { headers: user.headers })).json()).organizations[0].id;

/** Reads from the stream until `text` shows up. */
async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, text: string) {
  let seen = "";
  while (!seen.includes(text)) {
    const { value, done } = await reader.read();
    if (done) break;
    seen += new TextDecoder().decode(value);
  }
  return seen;
}

Deno.test("clients need to sign in", async () => {
  assertEquals((await t.app.request("/events")).status, 401);
});

Deno.test("a subscriber receives events published for its organization only", async () => {
  const res = await t.app.request("/events", { headers: user.headers });
  assertEquals(res.headers.get("content-type")?.startsWith("text/event-stream"), true);
  const reader = res.body!.getReader();
  await readUntil(reader, "event: ready");
  assertEquals(subscribers(orgId), 1);

  publish("some-other-org", "note.created", { id: "nope" });
  publish(orgId, "note.created", { id: "n1" });
  const seen = await readUntil(reader, "n1");
  assert(seen.includes("event: note.created") && seen.includes('{"id":"n1"}'));
  assert(!seen.includes("nope"));

  await reader.cancel();
  await new Promise((r) => setTimeout(r, 50));
  assertEquals(subscribers(orgId), 0);
});

addEventListener("unload", () => void t.close());
