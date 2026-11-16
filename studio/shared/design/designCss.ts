// Just enough CSS reading for the linter: flat rules, custom properties and var() resolution.
// shortcut: no real CSS parser (no @media-aware cascade, no specificity); upgrade if rules need it.

export interface CssRule {
  selector: string;
  decls: Map<string, string>;
}

export function readRules(html: string): CssRule[] {
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) =>
    m[1]!.replace(/\/\*[\s\S]*?\*\//g, "")
  ).join("\n");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim(),
    decls: declarations(m[2]!),
  }));
  const inline = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => ({
    selector: "[style]",
    decls: declarations(m[1]!),
  }));
  return [...rules, ...inline];
}

function declarations(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of body.split(";")) {
    const at = part.indexOf(":");
    if (at > 0) map.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim());
  }
  return map;
}

export const isRoot = (rule: CssRule) => /^(:root|html)$/i.test(rule.selector);

export function readTokens(rules: readonly CssRule[]): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const rule of rules.filter(isRoot)) for (const [k, v] of rule.decls) if (k.startsWith("--")) tokens.set(k, v);
  return tokens;
}

/** Replaces var(--x) with its token value, a few levels deep. */
export function resolveVars(value: string, tokens: ReadonlyMap<string, string>): string {
  let out = value;
  for (let i = 0; i < 4 && out.includes("var("); i++) {
    out = out.replace(
      /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g,
      (_, name: string, fallback?: string) => tokens.get(name) ?? fallback ?? "",
    );
  }
  return out;
}

export const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
