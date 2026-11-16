// The design gate: ONE parse (parse5 through cheerio), then an allowlist walk over the tree. What is
// not on the allowlist is dropped or unwrapped, what is kept is re-serialised, so the output is
// canonical (comments gone, attributes cleaned, `<html><head>` first). Linear in the input: no
// backtracking regex ever sees untrusted markup, and the walk is iterative (no stack overflow on
// 100 000 nested elements). The renderer applies the same policy to partial pages with DOMParser.
import * as cheerio from "cheerio";
import {
  ALLOWED_ELEMENTS,
  cleanAttribute,
  cleanCss,
  DROP_ELEMENTS,
  MAX_DESIGN_HTML_CHARS,
  newReport,
  PROBLEM,
  reportDropped,
} from "../../shared/design/index.ts";

interface TreeNode {
  type: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: TreeNode[];
  data?: string;
  parent?: TreeNode | null;
  prev?: TreeNode | null;
  next?: TreeNode | null;
}

export interface DesignAnalysis {
  /** The sanitised, canonical page ("" when rejected for size). */
  html: string;
  /** Why a model's output should be rejected rather than silently cleaned. Empty means it was already clean. */
  problems: string[];
  /** The page pointed at something remote: the user may choose to embed the allowed assets. */
  remote: boolean;
}

const MAX_DEPTH = 256;
const HEAD_ADDITIONS = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';

interface Frame {
  source: TreeNode[];
  index: number;
  out: TreeNode[];
  parent: TreeNode;
  /** Unwrapped element whose cleaned children replace it in the parent's list. */
  unwrap: boolean;
  depth: number;
}

/** Elements that need an explicit end tag (or are formatting elements): their nesting depth is what makes parse5 slow. */
const DEPTH_TAGS = new Set([
  "div",
  "span",
  "section",
  "article",
  "main",
  "nav",
  "header",
  "footer",
  "aside",
  "ul",
  "ol",
  "blockquote",
  "figure",
  "form",
  "table",
  "details",
  "label",
  "button",
  "svg",
  "g",
  "a",
  "b",
  "big",
  "code",
  "em",
  "font",
  "i",
  "nobr",
  "s",
  "small",
  "strike",
  "strong",
  "tt",
  "u",
]);
const MAX_ROUGH_DEPTH = 1500;

/** One linear pass that estimates nesting, so a hostile page is refused before parse5 sees it (its stack handling is quadratic in depth). */
export function nestsTooDeeply(html: string): boolean {
  let depth = 0;
  for (let at = html.indexOf("<"); at !== -1; at = html.indexOf("<", at + 1)) {
    const closing = html[at + 1] === "/";
    let end = at + (closing ? 2 : 1);
    while (end < html.length && end - at < 12 && /[a-zA-Z0-9]/.test(html[end]!)) end++;
    const name = html.slice(at + (closing ? 2 : 1), end).toLowerCase();
    if (!DEPTH_TAGS.has(name)) continue;
    depth += closing ? -1 : 1;
    if (depth > MAX_ROUGH_DEPTH) return true;
    if (depth < 0) depth = 0;
  }
  return false;
}

export function analyzeDesignHtml(
  html: string,
  options: { allowInlineScripts?: boolean; fragment?: boolean } = {},
): DesignAnalysis {
  const report = newReport();
  if (html.length > MAX_DESIGN_HTML_CHARS) return { html: "", problems: [PROBLEM.tooLarge], remote: false };
  if (nestsTooDeeply(html)) return { html: "", problems: ["Nested too deeply."], remote: false };
  const $ = options.fragment ? cheerio.load(html, null, false) : cheerio.load(html);
  const root = $.root()[0] as unknown as TreeNode;
  const stack: Frame[] = [{ source: root.children ?? [], index: 0, out: [], parent: root, unwrap: false, depth: 0 }];
  const finish = (frame: Frame) => {
    for (const child of frame.out) child.parent = frame.parent;
    frame.parent.children = frame.out;
    frame.out.forEach((child, i) => {
      child.prev = frame.out[i - 1] ?? null;
      child.next = frame.out[i + 1] ?? null;
    });
  };
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const node = frame.source[frame.index++];
    if (!node) {
      stack.pop();
      finish(frame);
      const below = stack[stack.length - 1];
      if (frame.unwrap && below) below.out.push(...frame.out);
      continue;
    }
    if (node.type === "text") {
      frame.out.push(node);
      continue;
    }
    if (node.type !== "tag" && node.type !== "script" && node.type !== "style") continue; // comments, directives, CDATA
    const tag = (node.name ?? "").toLowerCase();
    const attrs = node.attribs ?? {};
    if (tag === "script" && options.allowInlineScripts && attrs.src === undefined) {
      node.attribs = {};
      frame.out.push(node);
      continue; // the text inside is the trusted, main-built inline script
    }
    if (DROP_ELEMENTS.has(tag)) {
      reportDropped(tag, attrs, report);
      continue;
    }
    if (frame.depth >= MAX_DEPTH) {
      report.problems.add("Nested too deeply.");
      continue;
    }
    const keep = ALLOWED_ELEMENTS.has(tag);
    if (keep) {
      const clean: Record<string, string> = {};
      for (const [rawName, value] of Object.entries(attrs)) {
        const name = rawName.toLowerCase();
        const cleaned = cleanAttribute(tag, name, value, report);
        if (cleaned !== null) clean[name] = cleaned;
      }
      // The page frame is ours to describe: the preview sets <html> attributes itself.
      node.attribs = tag === "html" || tag === "head" ? {} : clean;
      if (tag === "style") {
        for (const child of node.children ?? []) {
          if (child.type === "text") child.data = cleanCss(child.data ?? "", report);
        }
        frame.out.push(node);
        continue;
      }
    }
    stack.push({ source: node.children ?? [], index: 0, out: [], parent: node, unwrap: !keep, depth: frame.depth + 1 });
    if (keep) frame.out.push(node);
  }
  let noBody = false;
  if (!options.fragment) {
    $("head").prepend(HEAD_ADDITIONS);
    noBody = $("body").length === 0; // a dropped frameset leaves none
    if ($("body").children().length === 0) report.problems.add(PROBLEM.notHtml);
  } else if ($.root().children().length === 0 && html.trim() !== "") report.problems.add(PROBLEM.notHtml);
  let out = options.fragment ? $.html() : `<!DOCTYPE html>${$.html()}`;
  if (noBody && out.endsWith("</html>")) out = `${out.slice(0, -"</html>".length)}<body></body></html>`;
  return { html: out, problems: [...report.problems], remote: report.remote };
}

/** Why this HTML should be rejected. Empty means acceptable as it is. */
export const validateDesignHtml = (html: string, options: { allowInlineScripts?: boolean } = {}): string[] =>
  analyzeDesignHtml(html, options).problems;

/** The page with everything outside the allowlist removed. */
export const sanitizeDesignHtml = (html: string, options: { fragment?: boolean } = {}): string =>
  analyzeDesignHtml(html, options).html;
