import { assertEquals } from "@std/assert";
import { locales, negotiate, t } from "../mod.ts";

Deno.test("translates with placeholders and falls back to English, then to the key", () => {
  assertEquals(t("es", "notes.count", { count: 3 }), "3 notas");
  assertEquals(t("fr", "common.save"), "Save");
  assertEquals(t("en", "does.not.exist"), "does.not.exist");
});

Deno.test("negotiates the best supported language", () => {
  assertEquals(negotiate("es-MX,es;q=0.9,en;q=0.8"), "es");
  assertEquals(negotiate("fr-FR,fr;q=0.9"), "en");
  assertEquals(negotiate(null), "en");
  assertEquals(locales.includes("en"), true);
});

Deno.test("the shipped catalogs pass the parity check", async () => {
  const check = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "-A",
      new URL("../../../../../i18n/check.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    ],
    stdout: "null",
    stderr: "piped",
  });
  const out = await check.output();
  assertEquals(out.success, true, new TextDecoder().decode(out.stderr));
});
