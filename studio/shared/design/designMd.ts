// DESIGN.md is the design system's source of truth: YAML front matter (name, colors as Material 3
// roles, typography, rounded, spacing) followed by prose. This reads it, compiles the front matter to
// :root custom properties, checks contrast of every role/on-role pair, and flags prose that quotes a
// colour different from the front matter.
// shortcut: a two-level YAML subset parser (maps of scalars), enough for this format; use `yaml` if it grows.
import { contrastRatio, parseColor } from "./designContrast.ts";

export type MdTree = { [key: string]: string | MdTree };

export interface DesignMdReport {
  name: string;
  css: string;
  count: number;
  errors: string[];
  /** role/on-role pairs below WCAG AA. */
  failing: { fg: string; bg: string; ratio: number }[];
  checkedPairs: number;
  /** Prose colours that disagree with the front matter. */
  mismatches: string[];
  tree: MdTree | null;
}

const unquote = (v: string) => v.trim().replace(/^(['"])(.*)\1$/, "$2");

export function parseFrontMatter(text: string): { tree: MdTree; prose: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text.trimStart());
  if (!m) return null;
  const root: MdTree = {};
  const stack: { indent: number; node: MdTree }[] = [{ indent: -1, node: root }];
  for (const line of m[1]!.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const at = line.indexOf(":");
    if (at < 0) continue;
    const key = unquote(line.slice(0, at));
    const value = line.slice(at + 1).replace(/\s+#.*$/, "").trim();
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]!.node;
    if (value === "") {
      const child: MdTree = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else parent[key] = unquote(value);
  }
  return { tree: root, prose: m[2]! };
}

const group = (tree: MdTree, name: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries((tree[name] as MdTree | undefined) ?? {}).filter((e): e is [string, string] =>
      typeof e[1] === "string"
    ),
  );

const cssVars = (prefix: string, values: Record<string, string>) =>
  Object.entries(values).map(([k, v]) => `  --${prefix}-${k.toLowerCase()}: ${v};`);

export function checkDesignMd(text: string): DesignMdReport {
  const empty: DesignMdReport = {
    name: "",
    css: "",
    count: 0,
    errors: [],
    failing: [],
    checkedPairs: 0,
    mismatches: [],
    tree: null,
  };
  const parsed = parseFrontMatter(text);
  if (!parsed) return { ...empty, errors: ["DESIGN.md has no YAML front matter."] };
  const { tree, prose } = parsed;
  const colors = group(tree, "colors");
  const lines: string[] = [];
  lines.push(
    ...cssVars("color", colors),
    ...cssVars("radius", group(tree, "rounded")),
    ...cssVars("space", group(tree, "spacing")),
  );
  for (const [tier, spec] of Object.entries((tree.typography as MdTree | undefined) ?? {})) {
    if (typeof spec === "string") continue;
    for (const [prop, value] of Object.entries(spec)) {
      if (typeof value === "string") {
        lines.push(`  --type-${tier}-${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value};`);
      }
    }
  }
  const errors: string[] = [];
  if (Object.keys(colors).length === 0) errors.push("No colors in the front matter.");
  const failing: DesignMdReport["failing"] = [];
  let checkedPairs = 0;
  for (const [role, value] of Object.entries(colors)) {
    const on = role === "background" ? colors["on-background"] : colors[`on-${role}`];
    const bg = parseColor(value);
    const fg = on ? parseColor(on) : null;
    if (!bg || !fg) continue;
    checkedPairs++;
    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) failing.push({ fg: `on-${role}`, bg: role, ratio: Math.round(ratio * 100) / 100 });
  }
  const mismatches: string[] = [];
  for (const m of prose.matchAll(/\*\*`?([a-z][\w-]*)`?\*\*[^\n#]*?(#[0-9a-fA-F]{6})\b/g)) {
    const declared = colors[m[1]!];
    if (declared && declared.toLowerCase() !== m[2]!.toLowerCase()) {
      mismatches.push(`${m[1]}: prose says ${m[2]}, front matter says ${declared}`);
    }
  }
  return {
    name: typeof tree.name === "string" ? tree.name : "",
    css: `:root{\n${lines.join("\n")}\n}`,
    count: lines.length,
    errors,
    failing,
    checkedPairs,
    mismatches,
    tree,
  };
}
