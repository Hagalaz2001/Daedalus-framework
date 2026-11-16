// design/tokens.json -> Dart constants for packages/app_core. Run by `deno task sync` from the project root.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const t = JSON.parse(readFileSync("design/tokens.json", "utf8"));
const hex = (v: string) => `Color(0xFF${v.replace("#", "").toUpperCase()})`;
const entries = (o: Record<string, string | number>) => Object.entries(o);
const dart = [
  "// Generated from design/tokens.json by scripts/tokens/mobile-flutter.ts. Do not edit; run `deno task sync`.",
  "// ignore_for_file: constant_identifier_names",
  "import 'package:flutter/painting.dart';",
  "",
  "abstract final class AppColors {",
  ...entries(t.color).map(([k, v]) => `  static const ${k} = ${hex(String(v))};`),
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
