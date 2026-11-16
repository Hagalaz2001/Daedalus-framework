import { assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";

const t = await createTestApp();
const ana = await t.signUp("searcher");
const ben = await t.signUp("snoop");

for (const text of ["Quarterly budget review with finance", "Budget for the offsite", "Lunch menu ideas"]) {
  await t.app.request("/notes", { method: "POST", headers: ana.headers, body: JSON.stringify({ text }) });
}
const search = (q: string, headers: HeadersInit = ana.headers) =>
  t.app.request(`/search?q=${encodeURIComponent(q)}`, { headers });

Deno.test("finds and ranks notes, highlighting matches", async () => {
  const res = await search("budget");
  const hits = await res.json();
  assertEquals(hits.length, 2);
  assertEquals(hits[0].snippet.includes("<b>"), true);
  assertEquals(t.deps.contract.validateResponse("GET", "/search", 200, hits), []);
});

Deno.test("websearch syntax: phrases and exclusions", async () => {
  assertEquals((await (await search('"budget review"')).json()).length, 1);
  assertEquals((await (await search("budget -offsite")).json()).length, 1);
});

Deno.test("results stay inside the organization and q is required", async () => {
  assertEquals(await (await search("budget", ben.headers)).json(), []);
  assertEquals((await t.app.request("/search", { headers: ana.headers })).status, 400);
});

addEventListener("unload", () => void t.close());
