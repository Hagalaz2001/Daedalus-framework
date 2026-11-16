// design/tokens.json -> Dart constants for packages/app_core. Run by `deno task sync` from the project root:
//   deno run -A scripts/tokens/mobile-flutter.ts <appDir> [--preset design/presets/editorial.json]
// design/tokens.json may be any preset file. Its optional `colorDark` block sets the dark palette; roles it leaves out
// (or the whole palette, when absent) are derived from the light colours. --preset deep-merges another file on top.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Json = Record<string, unknown>;

const argv = process.argv.slice(2);
const presetIdx = argv.indexOf("--preset");
const presetPath = presetIdx >= 0 ? argv[presetIdx + 1] : undefined;

const read = (p: string): Json => JSON.parse(readFileSync(p, "utf8"));
const merge = (a: Json, b: Json): Json => {
  const out: Json = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = v && typeof v === "object" && cur && typeof cur === "object" ? merge(cur as Json, v as Json) : v;
  }
  return out;
};

const t = (presetPath ? merge(read("design/tokens.json"), read(presetPath)) : read("design/tokens.json")) as {
  color: Record<string, string>;
  colorDark?: Record<string, string>;
  radius: Record<string, number>;
  space: Record<string, number>;
  font: { sans: string; mono: string };
};

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, w: number) => hex(rgb(a).map((v, i) => v * (1 - w) + rgb(b)[i]! * w));
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const onColor = (bg: string) => (luminance(bg) > 0.18 ? "#0b0f19" : "#ffffff");

/** Dark palette from the light one: ink becomes the canvas, paper becomes the text, accents lift for contrast. */
function deriveDark(c: Record<string, string>): Record<string, string> {
  const surface = mix(c.text!, "#000000", 0.35);
  const lift = (h: string) => mix(h, "#ffffff", 0.3);
  const primary = lift(c.primary!);
  return {
    primary,
    onPrimary: onColor(primary),
    surface,
    surfaceMuted: mix(surface, "#ffffff", 0.07),
    text: mix(c.surface!, surface, 0.04),
    textMuted: mix(c.surface!, surface, 0.35),
    border: mix(surface, "#ffffff", 0.16),
    success: lift(c.success!),
    warning: lift(c.warning!),
    danger: lift(c.danger!),
  };
}

const dark = { ...deriveDark(t.color), ...(t.colorDark ?? {}) };
const color = (v: string) => `Color(0xFF${v.replace("#", "").toUpperCase()})`;
const entries = (o: Record<string, string | number>) => Object.entries(o);

const dart = [
  "// Generated from design/tokens.json by scripts/tokens/mobile-flutter.ts. Do not edit; run `deno task sync`.",
  "// ignore_for_file: constant_identifier_names",
  "import 'package:flutter/painting.dart';",
  "",
  "/// Light palette.",
  "abstract final class AppColors {",
  ...entries(t.color).map(([k, v]) => `  static const ${k} = ${color(String(v))};`),
  "}",
  "",
  "/// Dark palette: `colorDark` from the tokens file, with missing roles derived from the light colours.",
  "abstract final class AppColorsDark {",
  ...entries(dark).map(([k, v]) => `  static const ${k} = ${color(String(v))};`),
  "}",
  "",
  "abstract final class AppRadius {",
  ...entries(t.radius).map(([k, v]) => `  static const double ${k} = ${v};`),
  "}",
  "",
  "abstract final class AppSpace {",
  ...entries(t.space).map(([k, v]) => `  static const double s${k} = ${v};`),
  "}",
  "",
  "abstract final class AppFonts {",
  `  static const sans = '${t.font.sans}';`,
  `  static const mono = '${t.font.mono}';`,
  "}",
  "",
].join("\n");

const out = "packages/app_core/lib/src/theme/tokens.g.dart";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, dart);
console.log(`  wrote ${out}`);
