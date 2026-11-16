// The one token core: read design/tokens.json (any preset file), merge `--preset`, derive the dark palette and do the
// colour maths. Every stack's emitter (flutter.ts, rn.ts, web.ts next to this file) only formats the result for its
// platform, so the same tokens.json yields the same dark theme everywhere.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

export type Palette = Record<string, string>;
export interface Tokens {
  color: Palette;
  /** Optional dark palette; roles it leaves out are derived from the light colours (see deriveDark). */
  colorDark?: Palette;
  radius: Record<string, number>;
  space: Record<string, number>;
  font: { sans: string; display?: string; mono: string };
}
type Json = Record<string, unknown>;

/** Deep merge: values of `b` win, nested objects merge. */
export function merge(a: Json, b: Json): Json {
  const out: Json = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = v && typeof v === "object" && cur && typeof cur === "object" ? merge(cur as Json, v as Json) : v;
  }
  return out;
}

/** Resolves `rel` from the current folder or up to six folders above it (apps run their emitter from a subfolder). */
export function findUp(rel: string): string {
  if (existsSync(rel)) return resolve(rel);
  let dir = resolve(".");
  for (let i = 0; i < 6; i++, dir = dirname(dir)) if (existsSync(resolve(dir, rel))) return resolve(dir, rel);
  throw new Error(`Cannot find ${rel}`);
}

const readJson = (p: string): Json => JSON.parse(readFileSync(p, "utf8"));

/** Reads the tokens file and, when given, deep-merges a preset file on top. */
export function loadTokens(path = "design/tokens.json", preset?: string): Tokens {
  const base = readJson(findUp(path));
  return (preset ? merge(base, readJson(findUp(preset))) : base) as unknown as Tokens;
}

/** Shared command line of the emitters: `<positional...> [--preset file] [--tokens file]`. */
export function parseEmitterArgs(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { preset: { type: "string" }, tokens: { type: "string" } },
  });
  return { positionals, preset: values.preset, tokens: values.tokens };
}

// ---------- colour maths ----------
export const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const hex = (c: number[]): string =>
  "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, w: number): string => hex(rgb(a).map((v, i) => v * (1 - w) + rgb(b)[i] * w));
export const luminance = (h: string): number => {
  const [r, g, b] = rgb(h).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Text colour that reads on `bg`. */
export const onColor = (bg: string): string => (luminance(bg) > 0.18 ? "#0b0f19" : "#ffffff");

/** Dark palette from the light one: ink becomes the canvas, paper becomes the text, accents lift for contrast. */
export function deriveDark(c: Palette): Palette {
  const surface = mix(c.text, "#000000", 0.35);
  const lift = (h: string) => mix(h, "#ffffff", 0.3);
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

/** The dark palette every emitter uses: `colorDark` roles win, missing ones come from deriveDark. */
export const darkPalette = (t: Tokens): Palette => ({ ...deriveDark(t.color), ...(t.colorDark ?? {}) });
