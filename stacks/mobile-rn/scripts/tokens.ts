// design/tokens.json -> theme files for the React Native app. Run by `deno task sync` from the project root:
//   deno run -A scripts/tokens/mobile-rn.ts <appDir> [--preset design/presets/editorial.json]
// Writes <appDir>/src/shared/theme/tokens.g.ts (JS access) and <appDir>/global.css (NativeWind variables for the
// React Native Reusables kit, shadcn naming). design/tokens.json may be any preset file; `colorDark` overrides the
// dark palette, which is otherwise derived from the light one (see deriveDark). --preset deep-merges another file on top.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const appDir = argv.find((a) => !a.startsWith("--")) ?? ".";
const args: Record<string, string | undefined> = Object.fromEntries(
  argv.flatMap((a, i) => (a.startsWith("--") ? [[a.slice(2), argv[i + 1]]] : [])),
);
const target = "ts";
const out = join(appDir, "src/shared/theme/tokens.g.ts");
args.css = join(appDir, "global.css");

const tokensPath = findUp(args.tokens ?? "design/tokens.json");

function findUp(rel) {
  if (existsSync(rel)) return resolve(rel);
  let dir = resolve(".");
  for (let i = 0; i < 6; i++, dir = dirname(dir)) if (existsSync(resolve(dir, rel))) return resolve(dir, rel);
  throw new Error(`Cannot find ${rel}`);
}
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const merge = (a, b) =>
  Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b ?? {})])].map((k) => [
      k,
      a[k] && typeof a[k] === "object" && b?.[k] && typeof b[k] === "object" ? merge(a[k], b[k]) : (b?.[k] ?? a[k]),
    ]),
  );

const t = args.preset ? merge(read(tokensPath), read(findUp(args.preset))) : read(tokensPath);

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, w) => hex(rgb(a).map((v, i) => v * (1 - w) + rgb(b)[i] * w));
const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const onColor = (bg) => (lum(bg) > 0.18 ? "#0b0f19" : "#ffffff");

/** Dark palette from the light one: ink becomes the canvas, paper becomes the text, accents lift for contrast. */
function deriveDark(c) {
  const surface = mix(c.text, "#000000", 0.35);
  const lift = (h) => mix(h, "#ffffff", 0.3);
  const primary = lift(c.primary);
  return {
    primary,
    onPrimary: onColor(primary),
    surface,
    surfaceMuted: mix(surface, "#ffffff", 0.07),
    text: mix(c.surface, surface, 0.04),
    textMuted: mix(c.surface, surface, 0.35),
    border: mix(surface, "#ffffff", 0.16),
    success: lift(c.success),
    warning: lift(c.warning),
    danger: lift(c.danger),
  };
}
const light = t.color;
const dark = { ...deriveDark(light), ...(t.colorDark ?? {}) };
const header = "Generated from design/tokens.json by scripts/gen-tokens.mjs. Do not edit; run `deno task tokens`.";

let text;
if (target === "dart") {
  const c = (h) => `Color(0xFF${h.slice(1).toUpperCase()})`;
  const colors = (name, o) => [
    `  static const ${name} = AppPalette(`,
    ...Object.entries(o).map(([k, v]) => `    ${k}: ${c(v)},`),
    "  );",
  ];
  text = [
    `// ${header}`,
    "import 'package:flutter/painting.dart';",
    "",
    "/// One colour per role. Screens read these through the theme (Theme.of(context).colorScheme", 
    "/// or AppTheme.of(context)), never directly.",
    "class AppPalette {",
    `  const AppPalette({${Object.keys(light).map((k) => `required this.${k}`).join(", ")}});`,
    ...Object.keys(light).map((k) => `  final Color ${k};`),
    "}",
    "",
    "abstract final class AppColors {",
    ...colors("light", light),
    ...colors("dark", dark),
    "}",
    "",
    "abstract final class AppRadius {",
    ...Object.entries(t.radius).map(([k, v]) => `  static const double ${k} = ${v};`),
    "}",
    "",
    "abstract final class AppSpace {",
    ...Object.entries(t.space).map(([k, v]) => `  static const double s${k} = ${v};`),
    "}",
    "",
    "abstract final class AppFonts {",
    `  static const sans = '${t.font.sans}';`,
    `  static const mono = '${t.font.mono}';`,
    "}",
    "",
  ].join("\n");
} else {
  text = [
    `// ${header}`,
    `export const tokens = ${JSON.stringify({ light, dark, radius: t.radius, space: t.space, font: t.font }, null, 2)} as const;`,
    "",
    "export type ColorRole = keyof typeof tokens.light;",
    "export type Palette = Record<ColorRole, string>;",
    "",
  ].join("\n");
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`  wrote ${out}`);

if (args.css) {
  const hsl = (h) => {
    const [r, g, b] = rgb(h).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let hue = 0, sat = 0;
    if (d) {
      sat = d / (1 - Math.abs(2 * l - 1));
      hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    }
    return `${Math.round(((hue * 60) + 360) % 360)} ${(sat * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
  };
  const vars = (c) => {
    const m = {
      background: c.surface, foreground: c.text, card: c.surface, "card-foreground": c.text, popover: c.surface,
      "popover-foreground": c.text, primary: c.primary, "primary-foreground": c.onPrimary, secondary: c.surfaceMuted,
      "secondary-foreground": c.text, muted: c.surfaceMuted, "muted-foreground": c.textMuted, accent: c.surfaceMuted,
      "accent-foreground": c.text, destructive: c.danger, "destructive-foreground": onColor(c.danger), border: c.border,
      input: c.border, ring: c.primary, success: c.success, warning: c.warning,
    };
    return Object.entries(m).map(([k, v]) => `    --${k}: ${hsl(v)};`).join("\n");
  };
  const radii = Object.entries(t.radius).map(([k, v]) => `    --radius-${k}: ${v}px;`).join("\n");
  const css = `/* ${header} */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${vars(light)}
${radii}
  }

  .dark:root {
${vars(dark)}
  }
}
`;
  writeFileSync(args.css, css);
  console.log(`  wrote ${args.css}`);
}
