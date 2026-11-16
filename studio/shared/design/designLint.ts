// Deterministic anti-slop linter for generated designs. No model involved: same HTML, same warnings.
import { contrastRatio, hueSaturation, parseColor } from "./designContrast.ts";
import { lintStructure } from "./designLintStructure.ts";
import { COLOR_LITERAL, type CssRule, isRoot, readRules, readTokens, resolveVars } from "./designCss.ts";

export interface LintWarning {
  id: string;
  message: string;
  /** What to ask the model to do about it. */
  fix: string;
}

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "inherit",
  "initial",
  "-apple-system",
  "blinkmacsystemfont",
]);
const SPACING_PROPS = /^(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/;
const toPx = (token: string): number | null => {
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(token);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : m[2] === "px" || n === 0 ? n : null;
};

const textOf = (html: string) => html.replace(/<(style|script|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");

function values(rules: readonly CssRule[], tokens: Map<string, string>, test: (prop: string) => boolean) {
  return rules.filter((r) => !isRoot(r)).flatMap((r) =>
    [...r.decls].filter(([p]) => test(p)).map(([p, v]) => ({ rule: r, prop: p, value: resolveVars(v, tokens) }))
  );
}

function fontFamilies(rules: readonly CssRule[], tokens: Map<string, string>): string[] {
  const names = values(rules, tokens, (p) => p === "font-family" || p === "font").flatMap(({ prop, value }) =>
    prop === "font" ? [] : [value.split(",")[0]!.replace(/["']/g, "").trim().toLowerCase()]
  );
  return [...new Set(names.filter((n) => n && !GENERIC_FONTS.has(n)))];
}

function purpleGradient(rules: readonly CssRule[], tokens: Map<string, string>): boolean {
  return values(rules, tokens, (p) => p.startsWith("background")).some(({ value }) => {
    if (!/gradient\(/i.test(value)) return false;
    return (value.match(COLOR_LITERAL) ?? []).some((c) => {
      const rgb = parseColor(c);
      const hs = rgb && hueSaturation(rgb);
      return hs !== null && hs.s > 0.35 && hs.h >= 255 && hs.h <= 310;
    });
  });
}

function lowContrast(rules: readonly CssRule[], tokens: Map<string, string>): string[] {
  const bad: string[] = [];
  for (const rule of rules.filter((r) => !isRoot(r))) {
    const fg = parseColor(resolveVars(rule.decls.get("color") ?? "", tokens));
    const bgRaw = resolveVars(rule.decls.get("background-color") ?? rule.decls.get("background") ?? "", tokens);
    const bg = parseColor(bgRaw.split(/\s+/)[0] ?? "");
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) bad.push(`${rule.selector} (${ratio.toFixed(1)}:1)`);
  }
  return bad;
}

function offScaleSpacing(rules: readonly CssRule[], tokens: Map<string, string>, html: string): string[] {
  const found = new Set<string>();
  for (const { value } of values(rules, tokens, (p) => SPACING_PROPS.test(p))) {
    for (const part of value.split(/\s+/)) {
      const px = toPx(part);
      if (px !== null && px > 2 && px % 4 !== 0) found.add(`${px}px`);
    }
  }
  for (const m of html.matchAll(/\b[pm][xytblr]?-\[(\d+)px\]/g)) if (+m[1]! % 4 !== 0) found.add(`${m[1]}px`);
  return [...found];
}

function offTokenColors(rules: readonly CssRule[], tokens: Map<string, string>): string[] {
  if (![...tokens.values()].some((v) => parseColor(v))) return [];
  const used = new Set<string>();
  for (const r of rules.filter((x) => !isRoot(x))) {
    for (const [prop, value] of r.decls) {
      if (prop.startsWith("--")) continue;
      for (const c of value.match(COLOR_LITERAL) ?? []) used.add(c.toLowerCase());
    }
  }
  return [...used];
}

const REGIONS = ["header", "nav", "aside", "footer"] as const;
const regionText = (html: string, tag: string) =>
  (new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "i").exec(html)?.[0] ?? "").replace(/\s+/g, " ").trim();

/** Regions (header, nav, aside, footer) that a refine dropped or rewrote. The "drift detector". */
export function shellDrift(before: string, after: string): string[] {
  return REGIONS.filter((tag) => {
    const b = regionText(before, tag);
    return b !== "" && b !== regionText(after, tag);
  });
}

const NEGATIVE = /\b(?:no|without|avoid|don'?t use)\s+(?:an?\s+|the\s+)?(sidebar|footer|header|navbar|nav|hero|gradient|emoji|modal)s?\b/gi;
const KEEP = /\bkeep\s+(?:the\s+)?(sidebar|footer|header|navbar|nav)\b/gi;
const PRESENT: Record<string, RegExp> = {
  sidebar: /<aside\b|class\s*=\s*"[^"]*sidebar/i,
  footer: /<footer\b/i,
  header: /<header\b/i,
  navbar: /<nav\b/i,
  nav: /<nav\b/i,
  hero: /class\s*=\s*"[^"]*hero/i,
  gradient: /gradient\(/i,
  emoji: /\p{Extended_Pictographic}/u,
  modal: /class\s*=\s*"[^"]*modal/i,
};

function briefConstraints(brief: string, html: string): string[] {
  const out: string[] = [];
  for (const m of brief.matchAll(NEGATIVE)) {
    if (PRESENT[m[1]!.toLowerCase()]?.test(html)) out.push(`The brief says no ${m[1]}, but the design has one.`);
  }
  for (const m of brief.matchAll(KEEP)) {
    if (!PRESENT[m[1]!.toLowerCase()]?.test(html)) out.push(`The brief says keep the ${m[1]}, but it is missing.`);
  }
  return out;
}

/** Lists need all four states (ready, loading, empty, error) as data-state variants. */
function missingListStates(html: string): string[] {
  const rows = (html.match(/<li\b/gi) ?? []).length + (html.match(/<tr\b/gi) ?? []).length;
  if (rows < 3) return [];
  return ["loading", "empty", "error"].filter((s) => !new RegExp(`data-state\\s*=\\s*["']${s}["']`, "i").test(html));
}

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, "");

/** Project tokens that the page redefines with another value, or the page declares none of them. */
function tokenDrift(tokens: ReadonlyMap<string, string>, project: Record<string, string>): string[] {
  const names = Object.keys(project);
  const present = names.filter((n) => tokens.has(n));
  if (present.length === 0) return ["none of the project tokens are declared"];
  return present.filter((n) => !/^--(font|space|radius)-/.test(n) && norm(tokens.get(n)!) !== norm(project[n]!)).map((n) =>
    `${n} is ${tokens.get(n)}, the project says ${project[n]}`
  );
}

export function lintDesign(
  html: string,
  context: { brief?: string; parent?: string; target?: string; projectTokens?: Record<string, string> } = {},
): LintWarning[] {
  const rules = readRules(html);
  const tokens = readTokens(rules);
  const out: LintWarning[] = lintStructure(html, context.target);
  const add = (id: string, message: string, fix: string) => out.push({ id, message, fix });

  if (tokens.size === 0) {
    add(
      "no-tokens",
      "No design tokens: the CSS has no :root custom properties.",
      "Declare colours, type sizes, spacing and radii as CSS custom properties on :root and use only those.",
    );
  }
  if (context.projectTokens && tokens.size > 0) {
    const drift = tokenDrift(tokens, context.projectTokens);
    if (drift.length) {
      add(
        "token-drift",
        `The page does not use the project's tokens: ${drift.slice(0, 2).join("; ")}.`,
        "Copy the project's token block verbatim at the top of the <style> and use only those variables.",
      );
    }
  }
  const missing = missingListStates(html);
  if (missing.length) {
    add(
      "list-states",
      `A list has no ${missing.join(", ")} state.`,
      'Give every list sibling elements with data-state="loading", "empty" and "error" (hidden), next to the visible data-state="ready".',
    );
  }
  const offToken = offTokenColors(rules, tokens);
  if (offToken.length >= 3) {
    add(
      "off-token-colors",
      `${offToken.length} colours are written inline instead of coming from tokens (${offToken.slice(0, 3).join(", ")}).`,
      "Replace hard-coded colours with the colour tokens from :root; add a token if a colour is genuinely needed.",
    );
  }
  if (purpleGradient(rules, tokens)) {
    add(
      "purple-gradient",
      "A purple or violet gradient: the default look of generated pages.",
      "Remove the purple gradient. Use a solid surface and one deliberate accent colour from the tokens.",
    );
  }
  const centered = values(rules, tokens, (p) => p === "text-align").filter((v) => /center/.test(v.value)).length;
  const lefted = values(rules, tokens, (p) => p === "text-align").filter((v) => /left|start/.test(v.value)).length;
  if (centered >= 4 && lefted === 0) {
    add(
      "centered-everything",
      `${centered} blocks are centred and none is left-aligned.`,
      "Left-align running text and lists; keep centring for one focal element at most.",
    );
  }
  const text = textOf(html);
  if (/\p{Extended_Pictographic}/u.test(text)) {
    add("emoji-icons", "Emoji are used as icons.", "Replace emoji with inline SVG icons drawn in the same stroke width.");
  }
  if (/lorem ipsum|dolor sit amet/i.test(text)) {
    add("lorem-ipsum", "Lorem ipsum placeholder text.", "Write real, specific copy for this product in place of the placeholder text.");
  }
  if (
    /<img\b(?![^>]*\bsrc\s*=\s*"data:)[^>]*>/i.test(html) ||
    /placehold\.(?:it|co)\b|via\.placeholder|picsum\.photos|unsplash\.com/i.test(html)
  ) {
    add(
      "placeholder-images",
      "Placeholder or empty images.",
      "Draw illustrations with inline SVG or CSS shapes, or remove the image. Do not leave empty image slots.",
    );
  }
  const fonts = fontFamilies(rules, tokens);
  if (fonts.length > 2) {
    add(
      "font-families",
      `${fonts.length} font families (${fonts.join(", ")}).`,
      "Use at most two font families: one for headings and one for text.",
    );
  }
  const sizes = new Set(values(rules, tokens, (p) => p === "font-size").map((v) => String(toPx(v.value) ?? v.value)));
  if (sizes.size > 5) {
    add(
      "type-scale",
      `${sizes.size} different font sizes on one screen.`,
      "Collapse the type to five sizes or fewer, all taken from the type-scale tokens.",
    );
  }
  const contrast = lowContrast(rules, tokens);
  if (contrast.length) {
    add(
      "contrast",
      `Text below WCAG AA contrast (4.5:1): ${contrast.slice(0, 3).join("; ")}.`,
      "Raise the contrast of the listed text/background pairs to at least 4.5:1 by changing the colour tokens, not by adding opacity.",
    );
  }
  const spacing = offScaleSpacing(rules, tokens, html);
  if (spacing.length >= 2) {
    add(
      "spacing-scale",
      `Spacing off the 4px scale: ${spacing.slice(0, 5).join(", ")}.`,
      "Snap every padding, margin and gap to the 4px spacing scale (4, 8, 12, 16, 24, 32...).",
    );
  }
  for (const message of briefConstraints(context.brief ?? "", html)) add("brief-constraint", message, `Respect the brief: ${message}`);
  if (context.parent) {
    const drift = shellDrift(context.parent, html);
    if (drift.length) {
      add(
        "shell-drift",
        `The ${drift.join(", ")} changed or disappeared from the previous version.`,
        `Restore the ${drift.join(", ")} exactly as in the previous version unless the instruction asked to change it.`,
      );
    }
  }
  return out;
}

/** The refine instruction behind the one-click "Fix these". */
export const fixPrompt = (warnings: readonly LintWarning[]) =>
  `Fix these design problems and change nothing else:\n${warnings.map((w, i) => `${i + 1}. ${w.message} ${w.fix}`).join("\n")}`;
