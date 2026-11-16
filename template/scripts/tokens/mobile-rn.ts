// design/tokens.json -> theme files for the React Native app. Run by `deno task sync` from the project root:
//   deno run -A scripts/tokens/mobile-rn.ts <appDir> [--preset design/presets/editorial.json]
// Writes <appDir>/src/shared/theme/tokens.g.ts (JS access) and <appDir>/global.css (NativeWind variables for the
// React Native Reusables kit, shadcn naming).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { darkPalette, loadTokens, onColor, type Palette, parseEmitterArgs, rgb, type Tokens } from "./lib.ts";

const HEADER = "Generated from design/tokens.json by scripts/tokens/mobile-rn.ts. Do not edit; run `deno task sync`.";

export function rnTokens(t: Tokens): string {
  return [
    `// ${HEADER}`,
    `export const tokens = ${
      JSON.stringify({ light: t.color, dark: darkPalette(t), radius: t.radius, space: t.space, font: t.font }, null, 2)
    } as const;`,
    "",
    "export type ColorRole = keyof typeof tokens.light;",
    "export type Palette = Record<ColorRole, string>;",
    "",
  ].join("\n");
}

const hsl = (h: string): string => {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let hue = 0, sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  return `${Math.round(((hue * 60) + 360) % 360)} ${(sat * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
};

/** NativeWind variables (shadcn naming) for the light and dark palette. */
export function rnCss(t: Tokens): string {
  const vars = (c: Palette) => {
    const m: Record<string, string> = {
      background: c.surface,
      foreground: c.text,
      card: c.surface,
      "card-foreground": c.text,
      popover: c.surface,
      "popover-foreground": c.text,
      primary: c.primary,
      "primary-foreground": c.onPrimary,
      secondary: c.surfaceMuted,
      "secondary-foreground": c.text,
      muted: c.surfaceMuted,
      "muted-foreground": c.textMuted,
      accent: c.surfaceMuted,
      "accent-foreground": c.text,
      destructive: c.danger,
      "destructive-foreground": onColor(c.danger),
      border: c.border,
      input: c.border,
      ring: c.primary,
      success: c.success,
      warning: c.warning,
    };
    return Object.entries(m).map(([k, v]) => `    --${k}: ${hsl(v)};`).join("\n");
  };
  const radii = Object.entries(t.radius).map(([k, v]) => `    --radius-${k}: ${v}px;`).join("\n");
  return `/* ${HEADER} */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${vars(t.color)}
${radii}
  }

  .dark:root {
${vars(darkPalette(t))}
  }
}
`;
}

if (import.meta.main) {
  const { positionals, preset, tokens } = parseEmitterArgs(Deno.args);
  const appDir = positionals[0] ?? ".";
  const t = loadTokens(tokens, preset);
  const ts = join(appDir, "src/shared/theme/tokens.g.ts");
  mkdirSync(dirname(ts), { recursive: true });
  writeFileSync(ts, rnTokens(t));
  console.log(`  wrote ${ts}`);
  const css = join(appDir, "global.css");
  writeFileSync(css, rnCss(t));
  console.log(`  wrote ${css}`);
}
