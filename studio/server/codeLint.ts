// Checks on the *generated source* before it is offered for export. The HTML design has its own linter; this one makes
// sure the translation kept the rules: tokens only, text from props, no placeholder copy.
import type { CodeKind } from "./export.ts";

export interface CodeIssue {
  id: string;
  message: string;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/** JSX text that is a literal sentence: `>Save changes<` outside braces. Attribute strings are allowed (labels come from copy too, but icons/ids are not text). */
const JSX_TEXT = />\s*([A-Za-z][A-Za-z0-9 ,.'!?-]{2,})\s*</g;
const DART_TEXT = /\bText\(\s*'[^'$]{3,}'/g;

export function lintGeneratedCode(kind: CodeKind, code: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const add = (id: string, message: string) => issues.push({ id, message });
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const hex = noComments.match(HEX);
  if (hex) {
    add("hard-coded-colour", `Hard-coded colours (${[...new Set(hex)].slice(0, 3).join(", ")}): use the kit's token classes or the theme.`);
  }
  if (kind !== "flutter" && /\b(?:p|m|gap|w|h|text)-\[\d+(?:px|rem)\]/.test(noComments)) {
    add("arbitrary-value", "Arbitrary pixel values: use the token scale.");
  }
  if (kind === "flutter" && /Color\(0x[0-9a-fA-F]+\)|Colors\.[a-z]/.test(noComments)) {
    add("hard-coded-colour", "Literal Color values: read colours from the theme.");
  }
  if (kind === "flutter" ? DART_TEXT.test(noComments) : [...noComments.matchAll(JSX_TEXT)].length > 0) {
    add("literal-text", "User-facing text is written inline: lift it into the `copy` prop so it can be localised.");
  }
  if (/lorem ipsum|dolor sit amet|\bTODO\b/i.test(code)) add("placeholder", "Placeholder text or TODO left in the code.");
  if (!/\bcopy\b/.test(code)) add("no-copy-prop", "The screen does not take a `copy` prop.");
  if (!/\b(loading|empty|error)\b/i.test(code)) add("states", "Loading, empty and error states are missing.");
  return issues;
}
