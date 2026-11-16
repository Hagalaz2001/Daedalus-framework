import { assertEquals } from "jsr:@std/assert@1";
import { choose, cmp, isAffected } from "./native-deno.ts";

Deno.test("affected range is >=2.9.7 and below the first fixed release", () => {
  assertEquals(isAffected("2.9.6", null), false);
  assertEquals(isAffected("2.9.7", null), true);
  assertEquals(isAffected("2.9.8", null), true);
  assertEquals(isAffected("2.10.0", null), true);
  assertEquals(isAffected("2.9.9", "2.9.9"), false);
  assertEquals(isAffected("2.9.8", "2.9.9"), true);
  assertEquals(cmp("2.9.10", "2.9.9"), 1);
});

Deno.test("unaffected Deno is used as is", async () => {
  const c = await choose("2.9.6", "/x/deno");
  assertEquals([c.deno, c.patched], ["/x/deno", false]);
});

Deno.test("affected Deno without a verified patched build fails loudly", async () => {
  let msg = "";
  await choose("2.9.8", "/x/deno").catch((e) => (msg = e.message));
  assertEquals(msg.includes("denoland/deno#37040"), true);
});
