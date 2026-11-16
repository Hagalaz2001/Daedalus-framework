// Surgical edits: the model answers a small request with a JSON patch instead of a whole page.
// This file only validates the patch; main applies it to the parsed HTML (projectDesignPatch.ts).

export type DesignPatchOp =
  | { op: "classes"; selector: string; add?: string[]; remove?: string[]; all?: boolean }
  | { op: "text"; selector: string; text: string; all?: boolean }
  | { op: "inner"; selector: string; html: string; all?: boolean }
  | { op: "remove"; selector: string; all?: boolean }
  | { op: "append"; selector: string; html: string; all?: boolean }
  | { op: "attr"; selector: string; name: string; value: string; all?: boolean };

export interface DesignPatch {
  ops: DesignPatchOp[];
}

export const MAX_PATCH_OPS = 30;
export const SAFE_PATCH_ATTRS = [
  "class",
  "id",
  "role",
  "alt",
  "title",
  "href",
  "aria-label",
  "aria-current",
  "aria-hidden",
  "aria-expanded",
  "lang",
  "type",
  "placeholder",
  "value",
  "name",
  "for",
  "width",
  "height",
  "viewBox",
  "data-state",
];

const isStr = (v: unknown, max = 20000): v is string => typeof v === "string" && v.length <= max;
const isList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && v.every((c) => isStr(c, 80) && /^[\w:/.%-]+$/.test(c));
/** Standard CSS only: no :contains, no script-ish selectors. */
const goodSelector = (s: unknown): s is string => {
  if (!isStr(s, 200) || s.trim() === "" || /:contains|[{};]/.test(s)) return false;
  // Complexity limits (a hostile selector must not make the patch slow): one :has at most, a few
  // alternatives, a bounded number of combinators, and no "of S" argument in :nth-*.
  const count = (needle: string) => s.split(needle).length - 1;
  const combinators = s.split(/[\s>+~]+/).length - 1;
  return count(":has(") <= 1 && count(",") <= 3 && combinators <= 12 && count(":not(") <= 3 && !/:nth-[a-z-]+\([^)]*\sof\s/i.test(s);
};

/** Returns the patch, or throws with the reason. The caller then escalates to a full regenerate. */
export function parseDesignPatch(raw: unknown): DesignPatch {
  const list = (raw as { ops?: unknown } | null)?.ops;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_PATCH_OPS) {
    throw new Error(`A patch needs 1-${MAX_PATCH_OPS} operations.`);
  }
  const ops = list.map((entry, i): DesignPatchOp => {
    const o = entry as Record<string, unknown>;
    const at = `Operation ${i + 1}`;
    if (!goodSelector(o.selector)) throw new Error(`${at}: bad selector.`);
    const base = { selector: o.selector, ...(o.all === true ? { all: true } : {}) };
    switch (o.op) {
      case "classes":
        if ((o.add !== undefined && !isList(o.add)) || (o.remove !== undefined && !isList(o.remove))) {
          throw new Error(`${at}: bad class list.`);
        }
        return {
          op: "classes",
          ...base,
          ...(o.add ? { add: o.add as string[] } : {}),
          ...(o.remove ? { remove: o.remove as string[] } : {}),
        };
      case "text":
        if (!isStr(o.text)) throw new Error(`${at}: text missing.`);
        return { op: "text", ...base, text: o.text };
      case "inner":
      case "append":
        if (!isStr(o.html)) throw new Error(`${at}: html missing.`);
        return { op: o.op, ...base, html: o.html };
      case "remove":
        return { op: "remove", ...base };
      case "attr": {
        const name = String(o.name);
        if (!SAFE_PATCH_ATTRS.includes(name) || !isStr(o.value, 2000) || /^\s*(javascript|data|vbscript):/i.test(o.value)) {
          throw new Error(`${at}: attribute not allowed.`);
        }
        return { op: "attr", ...base, name, value: o.value };
      }
      default:
        throw new Error(`${at}: unknown operation.`);
    }
  });
  return { ops };
}

/** Surgical by default; a whole-design change (theme, rebrand, translation, new layout, scripting) regenerates. */
const FULL_REQUEST =
  /\b(dark mode|light mode|dark theme|light theme|rebrand|re-?brand|translate|translation|restructure|re-?layout|redesign|rewrite|from scratch|script|canvas|animation|animate|new layout|different layout|theme)\b/i;
export const chooseEditMode = (
  instruction: string,
): "surgical" | "full" => (FULL_REQUEST.test(instruction) || instruction.length > 400 ? "full" : "surgical");
