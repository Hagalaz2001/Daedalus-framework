import { assert, assertEquals } from "jsr:@std/assert@1";
import { darkPalette, deriveDark, merge, mix, onColor, type Tokens } from "./lib.ts";
import { dartTokens } from "./mobile-flutter.ts";
import { rnCss, rnTokens } from "./mobile-rn.ts";
import { webCss } from "./web.ts";

const light = {
  primary: "#2a4bd7",
  onPrimary: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f6f8",
  text: "#0e1116",
  textMuted: "#525a66",
  border: "#e1e4ea",
  success: "#17743d",
  warning: "#a15c07",
  danger: "#b42318",
};
const tokens: Tokens = {
  color: light,
  radius: { sm: 6 },
  space: { "1": 4 },
  font: { sans: "Geist", mono: "Geist Mono" },
};

Deno.test("colour maths", () => {
  assertEquals(mix("#000000", "#ffffff", 0.5), "#808080");
  assertEquals(onColor("#ffffff"), "#0b0f19");
  assertEquals(onColor("#000000"), "#ffffff");
});

Deno.test("deriveDark covers every role and darkens the canvas", () => {
  const d = deriveDark(light);
  assertEquals(Object.keys(d).sort(), Object.keys(light).sort());
  assertEquals(d.surface, mix(light.text, "#000000", 0.35));
});

Deno.test("colorDark roles win, missing ones are derived", () => {
  const d = darkPalette({ ...tokens, colorDark: { surface: "#101010" } });
  assertEquals(d.surface, "#101010");
  assertEquals(d.primary, deriveDark(light).primary);
});

Deno.test("merge is deep", () => {
  assertEquals(merge({ a: { b: 1, c: 2 } }, { a: { c: 3 } }), { a: { b: 1, c: 3 } });
});

Deno.test("every emitter gives the same dark palette", () => {
  const dark = darkPalette(tokens);
  const dart = dartTokens(tokens);
  assert(
    dart.slice(dart.indexOf("AppColorsDark")).includes(
      "surface = Color(0xFF" + dark.surface.slice(1).toUpperCase() + ")",
    ),
  );
  assertEquals(JSON.parse(rnTokens(tokens).split("= ")[1].split(" as const")[0]).dark.surface, dark.surface);
  const web = webCss(tokens);
  assert(web.slice(web.indexOf(".dark {")).includes("--color-surface: " + dark.surface));
  assert(rnCss(tokens).includes(".dark:root {"));
});
