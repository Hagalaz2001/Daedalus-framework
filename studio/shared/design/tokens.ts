// Bridges a generated direction (Material 3 roles in its DESIGN.md front matter) to the blueprint's token file, so a
// chosen direction can be applied to design/tokens.json and every stack's theme.
import { type MdTree, parseFrontMatter } from "./designMd.ts";

/** The shape of design/tokens.json (and of each preset). */
export interface Tokens {
  color: Record<string, string>;
  colorDark?: Record<string, string>;
  radius?: Record<string, number>;
  space?: Record<string, number>;
  font?: Record<string, string>;
}

const group = (tree: MdTree, name: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries((tree[name] as MdTree | undefined) ?? {}).filter((e): e is [string, string] =>
      typeof e[1] === "string"
    ),
  );

const pick = (roles: Record<string, string>, fallback: Tokens["color"]): Tokens["color"] => ({
  primary: roles["primary"] ?? fallback.primary!,
  onPrimary: roles["on-primary"] ?? fallback.onPrimary!,
  surface: roles["surface"] ?? fallback.surface!,
  surfaceMuted: roles["surface-container"] ?? fallback.surfaceMuted!,
  text: roles["on-surface"] ?? fallback.text!,
  textMuted: roles["on-surface-variant"] ?? fallback.textMuted!,
  border: roles["outline-variant"] ?? fallback.border!,
  success: fallback.success!,
  warning: fallback.warning!,
  danger: roles["error"] ?? fallback.danger!,
});

/** Semantic colours that Material 3 has no role for: kept from the project's current tokens, readable on both schemes. */
const BASE: Tokens = {
  color: {
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
  },
  colorDark: {
    primary: "#8da2ff",
    onPrimary: "#0b1030",
    surface: "#0e1116",
    surfaceMuted: "#161a21",
    text: "#eef0f4",
    textMuted: "#a3abb8",
    border: "#262b34",
    success: "#4ccb85",
    warning: "#f0b45a",
    danger: "#ff8a7d",
  },
  radius: { sm: 6, md: 10, lg: 14 },
  space: { "1": 4, "2": 8, "3": 12, "4": 16, "6": 24, "8": 32 },
  font: { sans: "system-ui", display: "system-ui", mono: "ui-monospace" },
};

/** DESIGN.md (front matter with colors / colors-dark) -> design/tokens.json shape. Null when it has no colours. */
export function tokensFromDesignMd(text: string, current: Tokens | null = null): Tokens | null {
  const parsed = parseFrontMatter(text);
  if (!parsed) return null;
  const light = group(parsed.tree, "colors");
  if (!light["primary"]) return null;
  const dark = group(parsed.tree, "colors-dark");
  const base = current ?? BASE;
  return {
    color: pick(light, { ...BASE.color, ...base.color }),
    colorDark: pick(Object.keys(dark).length ? dark : light, { ...BASE.colorDark!, ...(base.colorDark ?? {}) }),
    radius: base.radius ?? BASE.radius,
    space: base.space ?? BASE.space,
    font: base.font ?? BASE.font,
  };
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `--color-primary: #2a4bd7;` lines for one token group, using the kit's variable names. */
const vars = (t: Tokens, dark: boolean): string[] => {
  const colors = dark ? (t.colorDark ?? t.color) : t.color;
  const out = Object.entries(colors).map(([k, v]) => `--color-${kebab(k)}: ${v};`);
  if (!dark) {
    out.push(...Object.entries(t.radius ?? {}).map(([k, v]) => `--radius-${k}: ${v}px;`));
    out.push(...Object.entries(t.space ?? {}).map(([k, v]) => `--space-${k}: ${v}px;`));
    out.push(
      ...Object.entries(t.font ?? {}).map(([k, v]) => `--font-${k}: "${v}", ui-sans-serif, system-ui, sans-serif;`),
    );
  }
  return out;
};

/** The :root block every generated design must carry verbatim. Dark values live under :root.dark (the kit's switch). */
export function tokensCss(t: Tokens): string {
  const light = `:root {\n  ${vars(t, false).join("\n  ")}\n}`;
  const dark = t.colorDark ? `\n:root.dark {\n  color-scheme: dark;\n  ${vars(t, true).join("\n  ")}\n}` : "";
  return light + dark;
}

/** Token name -> value for the project, used by the token-drift lint. */
export function tokenMap(t: Tokens): Record<string, string> {
  return Object.fromEntries(vars(t, false).map((line) => line.replace(/;$/, "").split(/:\s*/) as [string, string]));
}
