// design/tokens.json -> Dart constants for packages/app_core. Run by `deno task sync` from the project root:
//   deno run -A scripts/tokens/mobile-flutter.ts <appDir> [--preset design/presets/editorial.json]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { darkPalette, loadTokens, parseEmitterArgs, type Tokens } from "./lib.ts";

const color = (v: string) => `Color(0xFF${v.replace("#", "").toUpperCase()})`;
const entries = (o: Record<string, string | number>) => Object.entries(o);

export function dartTokens(t: Tokens): string {
  return [
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
    ...entries(darkPalette(t)).map(([k, v]) => `  static const ${k} = ${color(String(v))};`),
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
}

if (import.meta.main) {
  const { preset, tokens } = parseEmitterArgs(Deno.args);
  const out = "packages/app_core/lib/src/theme/tokens.g.dart";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, dartTokens(loadTokens(tokens, preset)));
  console.log(`  wrote ${out}`);
}
