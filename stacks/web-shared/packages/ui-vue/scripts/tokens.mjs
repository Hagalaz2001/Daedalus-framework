// design/tokens.json -> <kit>/src/styles/tokens.css (Tailwind v4 @theme + dark overrides + font imports).
// Run from the project root: `deno run -A packages/ui/scripts/tokens.mjs` (the `tokens` step of the web stacks). A copy lives in packages/ui-vue/scripts for Vue-only projects; keep them identical.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const src = process.argv[2] ?? "design/tokens.json";
// Writes the theme into every web kit present in the project (React kit, Vue kit); an explicit path overrides.
const outs = process.argv[3] ? [process.argv[3]] : ["packages/ui", "packages/ui-vue"].filter((d) => existsSync(d)).map((d) => `${d}/src/styles/tokens.css`);
const t = JSON.parse(readFileSync(src, "utf8"));
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Fallback so a tokens.json without `colorDark` still gets a usable dark theme.
const dark = t.colorDark ?? {
  ...t.color,
  surface: "#0e1116", surfaceMuted: "#161a21", text: "#eef0f4", textMuted: "#a3abb8", border: "#262b34",
};
const vars = (c) => Object.entries(c).map(([k, v]) => `  --color-${kebab(k)}: ${v};`);

// Fontsource variable fonts: "Geist Mono" -> @fontsource-variable/geist-mono, family "Geist Mono Variable".
const fontNames = [...new Set(Object.values(t.font))];
const slug = (n) => n.toLowerCase().replace(/\s+/g, "-");
const stack = (n, fallback) => `"${n} Variable", "${n}", ${fallback}`;
const sans = t.font.sans, display = t.font.display ?? t.font.sans, mono = t.font.mono;

const css = [
  `/* Generated from design/tokens.json by packages/ui/scripts/tokens.mjs. Do not edit; run \`deno task sync\`. */`,
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

for (const out of outs) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, css);
  console.log(`  wrote ${out}`);
}
