// design/tokens.json -> <kit>/src/styles/tokens.css (Tailwind v4 @theme + dark overrides + font imports) for every web
// kit present in the project (packages/ui React kit, packages/ui-vue Vue kit). Run from the project root:
//   deno run -A scripts/tokens/web.ts [design/tokens.json] [out.css]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { darkPalette, loadTokens, type Palette, parseEmitterArgs, type Tokens } from "./lib.ts";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const vars = (c: Palette) => Object.entries(c).map(([k, v]) => `  --color-${kebab(k)}: ${v};`);

// Fontsource variable fonts: "Geist Mono" -> @fontsource-variable/geist-mono, family "Geist Mono Variable".
const slug = (n: string) => n.toLowerCase().replace(/\s+/g, "-");
const stack = (n: string, fallback: string) => `"${n} Variable", "${n}", ${fallback}`;

export function webCss(t: Tokens): string {
  const dark = darkPalette(t);
  const fontNames = [...new Set(Object.values(t.font))];
  const sans = t.font.sans, display = t.font.display ?? t.font.sans, mono = t.font.mono;
  return [
    "/* Generated from design/tokens.json by scripts/tokens/web.ts. Do not edit; run `deno task sync`. */",
    ...fontNames.map((n) => `@import "@fontsource-variable/${slug(n)}";`),
    "",
    "@theme {",
    ...vars(t.color),
    ...Object.entries(t.radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
    `  --font-sans: ${stack(sans, "ui-sans-serif, system-ui, sans-serif")};`,
    `  --font-display: ${stack(display, "ui-sans-serif, system-ui, sans-serif")};`,
    `  --font-mono: ${stack(mono, "ui-monospace, monospace")};`,
    "}",
    "",
    "/* Dark: explicit class wins; without JS, follow the system unless the page forces light. */",
    ".dark {",
    "  color-scheme: dark;",
    ...vars(dark),
    "}",
    "@media (prefers-color-scheme: dark) {",
    "  :root:not(.light):not(.dark) {",
    "    color-scheme: dark;",
    ...vars(dark).map((l) => `  ${l}`),
    "  }",
    "}",
    "",
  ].join("\n");
}

if (import.meta.main) {
  const { positionals } = parseEmitterArgs(Deno.args);
  const css = webCss(loadTokens(positionals[0] ?? "design/tokens.json"));
  const outs = positionals[1]
    ? [positionals[1]]
    : ["packages/ui", "packages/ui-vue"].filter((d) => existsSync(d)).map((d) => `${d}/src/styles/tokens.css`);
  for (const out of outs) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, css);
    console.log(`  wrote ${out}`);
  }
}
