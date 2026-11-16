// Markup-level checks and the checklist rows. Split from designLint.ts to keep both small.
import { readRules, readTokens, resolveVars } from "./designCss.ts";
import type { LintWarning } from "./designLint.ts";

/** Every check, in checklist order, so the UI can show a pass/fail row for each. */
export const LINT_RULES: readonly { id: string; label: string }[] = [
  { id: "no-tokens", label: "Uses design tokens" },
  { id: "token-drift", label: "Matches the project tokens" },
  { id: "list-states", label: "Lists have loading, empty and error states" },
  { id: "off-token-colors", label: "Colours come from tokens" },
  { id: "purple-gradient", label: "No default purple gradient" },
  { id: "centered-everything", label: "Not everything centred" },
  { id: "emoji-icons", label: "No emoji icons" },
  { id: "lorem-ipsum", label: "Real copy" },
  { id: "placeholder-images", label: "No placeholder images" },
  { id: "font-families", label: "Two font families at most" },
  { id: "type-scale", label: "Five font sizes at most" },
  { id: "contrast", label: "Contrast meets WCAG AA" },
  { id: "spacing-scale", label: "Spacing on the 4px scale" },
  { id: "landmarks", label: "Has a main landmark" },
  { id: "unlabelled-inputs", label: "Inputs are labelled" },
  { id: "svg-viewbox", label: "SVGs have a viewBox" },
  { id: "hover-layout", label: "Hover does not shift layout" },
  { id: "transitions", label: "Transitions use opacity/transform" },
  { id: "touch-targets", label: "Touch targets at least 44px" },
  { id: "brief-constraint", label: "Follows the brief" },
  { id: "shell-drift", label: "Shell unchanged by the edit" },
];

const px = (value: string): number | null => {
  const m = /^([\d.]+)(px|rem)?$/.exec(value.trim());
  return m ? parseFloat(m[1]!) * (m[2] === "rem" ? 16 : 1) : null;
};

export function lintStructure(html: string, target?: string): LintWarning[] {
  const rules = readRules(html);
  const tokens = readTokens(rules);
  const out: LintWarning[] = [];
  const add = (id: string, message: string, fix: string) => out.push({ id, message, fix });
  if (!/<main\b|role\s*=\s*"main"/i.test(html)) {
    add(
      "landmarks",
      "No <main> landmark.",
      "Wrap the page content in a <main> element, with <header> and <nav> for the shell.",
    );
  }
  const loose = [...html.matchAll(/<input\b[^>]*>/gi)].filter((m) =>
    !/type\s*=\s*"(hidden|submit|button|checkbox|radio)"/i.test(m[0]) && !/aria-label/i.test(m[0])
  );
  if (loose.length && !/<label\b/i.test(html)) {
    add(
      "unlabelled-inputs",
      `${loose.length} input(s) have no label.`,
      "Give every input a visible <label> or an aria-label.",
    );
  }
  if (/<svg\b(?![^>]*viewBox)/i.test(html)) {
    add("svg-viewbox", "An SVG has no viewBox.", "Add a viewBox to every inline SVG so it scales.");
  }
  const shifting = rules.filter((r) =>
    /:hover/.test(r.selector) &&
    [...r.decls.keys()].some((p) => /^(padding|margin|border(-width)?|width|height|font-size)/.test(p))
  );
  if (shifting.length) {
    add(
      "hover-layout",
      `Hover changes layout in ${shifting.slice(0, 2).map((r) => r.selector).join(", ")}.`,
      "Hover and focus states may change colour, opacity, shadow or transform only, never size, padding or border width.",
    );
  }
  const slow = rules.some((r) =>
    [...r.decls].some(([p, v]) => p.startsWith("transition") && /\ball\b|width|height|margin|padding|top|left/.test(v))
  );
  if (slow) {
    add(
      "transitions",
      "A transition animates layout properties or 'all'.",
      "Animate only opacity and transform, 150-300ms.",
    );
  }
  {
    const small = rules
      .filter((r) => /button|\.btn|\bnav a|\.tab/.test(r.selector))
      .flatMap((r) => ["height", "min-height"].map((p) => px(resolveVars(r.decls.get(p) ?? "", tokens))))
      .filter((v): v is number => v !== null && v < (target === "flutter-phone" ? 48 : 44));
    if (small.length) {
      add(
        "touch-targets",
        "Some controls are shorter than 44px.",
        "Make every tappable control at least 44px tall (48px on phones).",
      );
    }
  }
  return out;
}
