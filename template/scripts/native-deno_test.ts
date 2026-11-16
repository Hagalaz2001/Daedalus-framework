import { assertEquals } from "jsr:@std/assert@1";
import { ASSETS, choose, cmp, isAffected } from "./native-deno.ts";

Deno.test("affected range is >=2.9.7 and below the first fixed release", () => {
  assertEquals(isAffected("2.9.6", null), false);
  assertEquals(isAffected("2.9.7", null), true);
  assertEquals(isAffected("2.10.0", null), true);
  assertEquals(isAffected("2.9.12", "2.9.12"), false);
  assertEquals(isAffected("2.9.8", "2.9.12"), true);
  assertEquals(cmp("2.9.10", "2.9.9"), 1);
});

Deno.test("unaffected Deno is used as is", async () => {
  const c = await choose("2.9.6", "/x/deno");
  assertEquals([c.deno, c.pinned], ["/x/deno", false]);
});

Deno.test("affected Deno without the pinned build installed fails with the install hint", async () => {
  const prev = Deno.env.get("DAEDALUS_CACHE");
  Deno.env.set("DAEDALUS_CACHE", await Deno.makeTempDir());
  let msg = "";
  await choose("2.9.8", "/x/deno").catch((e) => (msg = e.message));
  if (prev) Deno.env.set("DAEDALUS_CACHE", prev);
  else Deno.env.delete("DAEDALUS_CACHE");
  assertEquals(msg.includes("--install") || msg.includes("no known official"), true);
});

Deno.test("every pinned checksum is a sha-256 hex digest", () => {
  for (const a of Object.values(ASSETS)) assertEquals(/^[0-9a-f]{64}$/.test(a.sha256), true);
  assertEquals(Object.keys(ASSETS).length, 5);
});
