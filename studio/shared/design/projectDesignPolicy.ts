// The one allowlist every design passes through, whoever parsed it: main walks a cheerio tree, the
// renderer walks a DOMParser document, both ask these functions what to keep. Nothing here uses a
// backtracking regex over untrusted input; scans are single linear passes (indexOf loops).

export interface DesignReport {
  problems: Set<string>;
  /** True when the page pointed at something remote (an inline-on-request candidate). */
  remote: boolean;
}

export const newReport = (): DesignReport => ({ problems: new Set(), remote: false });

export const PROBLEM = {
  script: "Contains a script.",
  externalScript: "Loads an external script.",
  frames: "Contains an iframe, object, embed or base tag.",
  refresh: "Redirects with a meta refresh.",
  handlers: "Contains inline event handlers.",
  scheme: "Contains a javascript: URL.",
  remote: "Loads a remote URL (image, stylesheet, font or script).",
  notHtml: "Not an HTML document.",
  tooLarge: "File is larger than 2 MB.",
} as const;

export const MAX_DESIGN_HTML_CHARS = 2 * 1024 * 1024;
const MAX_ATTR_CHARS = 10_000;
const MAX_CSS_CHARS = 500_000;

/** Elements that are removed together with everything inside them. */
export const DROP_ELEMENTS = new Set([
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "portal",
  "base",
  "link",
  "template",
  "noscript",
  "foreignobject",
  "math",
  "meta",
  "source",
  "track",
  "audio",
  "video",
  "canvas",
  "dialog",
  "fencedframe",
  "param",
  "bgsound",
]);

export const ALLOWED_ELEMENTS = new Set([
  "html",
  "head",
  "body",
  "title",
  "style",
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "br",
  "button",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "meter",
  "nav",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "select",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "wbr",
  // inline SVG
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "symbol",
  "use",
  "pattern",
  "desc",
]);

const GLOBAL_ATTRS = new Set(["class", "id", "lang", "dir", "title", "role", "hidden", "tabindex", "style"]);
const SVG_ATTRS = new Set([
  "viewbox",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "fill-opacity",
  "fill-rule",
  "clip-rule",
  "clip-path",
  "mask",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "points",
  "transform",
  "opacity",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "preserveaspectratio",
  "text-anchor",
  "dominant-baseline",
  "font-size",
  "font-weight",
  "font-family",
  "letter-spacing",
  "patternunits",
  "patterntransform",
]);
const TAG_ATTRS: Record<string, readonly string[]> = {
  a: ["href", "rel"],
  img: ["src", "alt", "width", "height"],
  input: ["type", "name", "value", "placeholder", "checked", "disabled", "for", "min", "max", "step", "required", "readonly", "maxlength"],
  button: ["type", "disabled", "name", "value"],
  label: ["for"],
  textarea: ["name", "placeholder", "rows", "cols", "disabled", "readonly", "required"],
  select: ["name", "disabled", "required", "multiple"],
  option: ["value", "selected", "disabled", "label"],
  optgroup: ["label", "disabled"],
  form: [],
  td: ["colspan", "rowspan", "headers"],
  th: ["colspan", "rowspan", "headers", "scope"],
  col: ["span"],
  colgroup: ["span"],
  time: ["datetime"],
  meter: ["value", "min", "max", "low", "high", "optimum"],
  progress: ["value", "max"],
  ol: ["start", "reversed", "type"],
  details: ["open"],
  data: ["value"],
  use: ["href", "xlink:href"],
};
/** Attributes whose value can fetch something; seeing one with a remote value marks the page "remote". */
const FETCHING_ATTRS = new Set([
  "src",
  "srcset",
  "poster",
  "action",
  "formaction",
  "background",
  "ping",
  "data",
  "href",
  "xlink:href",
  "codebase",
  "manifest",
]);

/** Lowercased value with whitespace, control and zero-width characters removed: how a browser reads a scheme. */
export const normalizeUrl = (value: string): string => {
  let out = "";
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    if (c <= 0x20 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || c === 0x2028 || c === 0x2029 || c === 0xfeff) continue;
    out += ch.toLowerCase();
  }
  return out;
};

const schemeOf = (normalized: string): string | null => {
  const colon = normalized.indexOf(":");
  if (colon < 1) return null;
  const scheme = normalized.slice(0, colon);
  return /^[a-z][a-z0-9+.-]*$/.test(scheme) ? scheme : null; // bounded: the slice is a scheme-sized prefix check
};

const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,]/;

/** Decides one URL-bearing value. Returns the value to keep or null; records why in the report. */
export function cleanUrl(tag: string, attr: string, value: string, report: DesignReport): string | null {
  const normalized = normalizeUrl(value.length > MAX_ATTR_CHARS ? "" : value);
  if (normalized === "") return null;
  if (normalized.startsWith("#")) return value.trim();
  if (normalized.startsWith("//")) {
    report.remote = true;
    if (!(tag === "a" && attr === "href")) report.problems.add(PROBLEM.remote);
    return tag === "a" && attr === "href" ? value.trim() : null;
  }
  const scheme = schemeOf(normalized);
  if (scheme === null) return tag === "a" && attr === "href" ? value.trim() : null; // relative: harmless on a link, useless elsewhere
  if (scheme === "data") {
    return tag === "img" && attr === "src" && DATA_IMAGE.test(normalized)
      ? [...value].filter((ch) => ch.codePointAt(0)! > 0x20).join("")
      : null;
  }
  if (scheme === "http" || scheme === "https") {
    report.remote = true;
    if (tag === "a" && attr === "href") return value.trim(); // a link loads nothing; the preview never navigates
    report.problems.add(PROBLEM.remote);
    return null;
  }
  if ((scheme === "mailto" || scheme === "tel") && tag === "a" && attr === "href") return value.trim();
  report.problems.add(PROBLEM.scheme);
  return null;
}

function codePointText(code: number): string {
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
}

/** Linear CSS scrub: resolves escapes, removes comments and @import, keeps only local url()s, neutralises legacy script hooks. */
export function cleanCss(input: string, report: DesignReport): string {
  let css = input.length > MAX_CSS_CHARS ? input.slice(0, MAX_CSS_CHARS) : input;
  // Escapes first, so \75rl( is seen as url( (what the scan checks is what is written).
  let out = "";
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]!;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    let j = i + 1;
    let hex = "";
    while (j < css.length && hex.length < 6 && /[0-9a-fA-F]/.test(css[j]!)) hex += css[j++];
    if (hex) {
      out += codePointText(parseInt(hex, 16));
      if (/[ \t\n\r\f]/.test(css[j] ?? "")) j++;
    } else if (j < css.length && css[j] !== "\n") out += css[j++];
    i = j - 1;
  }
  css = out;
  // Comments, by indexOf: an unclosed one drops the rest.
  out = "";
  for (let at = 0; at < css.length;) {
    const open = css.indexOf("/*", at);
    if (open === -1) {
      out += css.slice(at);
      break;
    }
    out += css.slice(at, open);
    const close = css.indexOf("*/", open + 2);
    if (close === -1) break;
    at = close + 2;
  }
  css = out;
  const lower = css.toLowerCase();
  out = "";
  for (let at = 0; at < css.length;) {
    const importAt = lower.indexOf("@import", at);
    const urlAt = lower.indexOf("url(", at);
    const next = importAt === -1 ? urlAt : urlAt === -1 ? importAt : Math.min(importAt, urlAt);
    if (next === -1) {
      out += css.slice(at);
      break;
    }
    out += css.slice(at, next);
    if (next === importAt) {
      const end = css.indexOf(";", next);
      report.remote = true;
      report.problems.add(PROBLEM.remote);
      at = end === -1 ? css.length : end + 1;
      continue;
    }
    const end = css.indexOf(")", next);
    const inner = css.slice(next + 4, end === -1 ? css.length : end).trim().replace(/^["']|["']$/g, "");
    const normalized = normalizeUrl(inner);
    if (normalized.startsWith("#") || DATA_IMAGE.test(normalized)) out += css.slice(next, end === -1 ? css.length : end + 1);
    else {
      if (normalized.startsWith("//") || normalized.startsWith("http:") || normalized.startsWith("https:")) {
        report.remote = true;
        report.problems.add(PROBLEM.remote);
      } else if (normalized !== "") report.problems.add(PROBLEM.scheme);
      out += "none";
    }
    at = end === -1 ? css.length : end + 1;
  }
  return out
    .replace(/expression\(/gi, "x(")
    .replace(/-moz-binding|behavior\s*:|image-set\(|cross-fade\(|element\(|paint\(/gi, "x(")
    .replace(/</g, "\\3c ");
}

/** The cleaned value of one attribute, or null to drop it. `tag` and `name` are lowercase. */
export function cleanAttribute(tag: string, name: string, value: string, report: DesignReport): string | null {
  if (name.startsWith("on")) {
    report.problems.add(PROBLEM.handlers);
    return null;
  }
  if (value.length > MAX_ATTR_CHARS) return null;
  if (name === "style") return cleanCss(value, report);
  const allowed = GLOBAL_ATTRS.has(name) || name.startsWith("aria-") || name.startsWith("data-") || TAG_ATTRS[tag]?.includes(name) ||
    (SVG_ATTRS.has(name) && isSvgTag(tag));
  if (!allowed) {
    if (FETCHING_ATTRS.has(name)) {
      // Dropped anyway; only record why (srcset and friends can hold several URLs).
      const n = normalizeUrl(value);
      if (n.includes("http:") || n.includes("https:") || n.includes("//")) {
        report.remote = true;
        report.problems.add(PROBLEM.remote);
      }
      if (n.includes("javascript:") || n.includes("vbscript:")) report.problems.add(PROBLEM.scheme);
    }
    return null;
  }
  if (name === "href" || name === "xlink:href" || name === "src") {
    return cleanUrl(tag, name === "xlink:href" ? "href" : name, value, report);
  }
  if (/url\(/i.test(value) && name !== "class") return cleanCss(value, report);
  return value;
}

const SVG_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "symbol",
  "use",
  "pattern",
  "desc",
]);
export const isSvgTag = (tag: string) => SVG_TAGS.has(tag);

/** Records why an element is dropped. */
export function reportDropped(tag: string, attrs: Record<string, string | undefined>, report: DesignReport): void {
  switch (tag) {
    case "script":
      report.problems.add(attrs.src !== undefined ? PROBLEM.externalScript : PROBLEM.script);
      if (attrs.src !== undefined) report.remote = true;
      return;
    case "meta":
      if (attrs["http-equiv"] !== undefined) report.problems.add(PROBLEM.refresh);
      return;
    case "link":
      if (attrs.href && cleanUrl("link", "href", attrs.href, report) === null) report.problems.add(PROBLEM.remote);
      return;
    case "iframe":
    case "frame":
    case "frameset":
    case "object":
    case "embed":
    case "applet":
    case "portal":
    case "base":
    case "fencedframe":
      report.problems.add(PROBLEM.frames);
      return;
    default:
  }
}
