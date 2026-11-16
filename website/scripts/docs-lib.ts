// Pure helpers for sync-docs.ts: markdown section splitting, link rewriting, and escaping of stray angle brackets.
import { posix } from "node:path";

const HTML_TAGS = new Set([
  "a", "b", "br", "code", "details", "div", "em", "hr", "i", "img", "kbd", "li", "ol", "p", "pre", "picture", "source",
  "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "th", "thead", "tr", "ul",
]);

const FENCE = /^\s*(```|~~~)/;

export interface Section {
  title: string;
  body: string;
}

/** Splits markdown at level-2 headings. Fenced code is respected. `preamble` is everything before the first one. */
export function splitSections(md: string): { preamble: string; sections: Section[] } {
  const sections: Section[] = [];
  const pre: string[] = [];
  let fence = false;
  let cur: { title: string; lines: string[] } | null = null;
  for (const line of md.split("\n")) {
    if (FENCE.test(line)) fence = !fence;
    const h = !fence && /^##\s+(.*)$/.exec(line);
    if (h) {
      if (cur) sections.push({ title: cur.title, body: cur.lines.join("\n").trim() });
      cur = { title: h[1].trim(), lines: [] };
    } else (cur ? cur.lines : pre).push(line);
  }
  if (cur) sections.push({ title: cur.title, body: cur.lines.join("\n").trim() });
  return { preamble: pre.join("\n").trim(), sections };
}

/** Returns "## Title\n\nbody" for the first section whose title starts with `prefix`, or "" when there is none. */
export function pickSection(md: string, prefix: string, asTitle?: string): string {
  const s = splitSections(md).sections.find((x) => x.title.toLowerCase().startsWith(prefix.toLowerCase()));
  return s ? `## ${asTitle ?? s.title}\n\n${s.body}\n` : "";
}

export function firstHeading(md: string): string | undefined {
  return /^#\s+(.+)$/m.exec(md)?.[1].trim();
}

export function stripFirstHeading(md: string): string {
  return md.replace(/^#\s+.+\n+/m, "");
}

/** Shifts every heading down one level (outside fences), used when several documents become sections of one page. */
export function demoteHeadings(md: string): string {
  let fence = false;
  return md.split("\n").map((l) => {
    if (FENCE.test(l)) fence = !fence;
    return !fence && /^#{1,5}\s/.test(l) ? "#" + l : l;
  }).join("\n");
}

/** Plain-text summary for the page description: the first paragraph that is not a quote, table, list or code. */
export function describe(md: string): string {
  for (const para of md.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p || /^(#|>|\||[-*]\s|\d+\.\s|```|<|!\[|:::)/.test(p)) continue;
    const text = p.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").replace(/\s+/g, " ");
    return text.length > 158 ? text.slice(0, 155).replace(/\s\S*$/, "") + "..." : text;
  }
  return "";
}

export interface LinkEnv {
  /** Repo-relative path of the file the text came from. */
  from: string;
  /** Repo-relative path -> site URL (with trailing slash). */
  pages: Map<string, string>;
  /** Does a repo-relative path exist, and is it a directory? */
  stat: (p: string) => "file" | "dir" | null;
  /** Called for local images; returns the URL to put in the page. */
  image: (repoPath: string) => string;
  github: string;
  onBroken?: (target: string, from: string) => void;
}

const LINK = /(!?)\[([^\]]*)\]\(<?([^)\s>]+)>?((?:\s+"[^"]*")?)\)/g;

export function rewriteLinks(line: string, env: LinkEnv): string {
  return line.replace(LINK, (whole, bang: string, text: string, target: string, title: string) => {
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return whole;
    const [path, anchor = ""] = target.split("#");
    const resolved = posix.normalize(posix.join(posix.dirname(env.from), path));
    if (resolved.startsWith("..")) return whole;
    const hash = anchor ? "#" + anchor : "";
    if (bang) {
      return env.stat(resolved) === "file" ? `![${text}](${env.image(resolved)}${title})` : whole;
    }
    const page = env.pages.get(resolved.replace(/\/$/, ""));
    if (page) return `[${text}](${page}${hash}${title})`;
    const kind = env.stat(resolved);
    if (kind) {
      return `[${text}](${env.github}/${kind === "dir" ? "tree" : "blob"}/main/${resolved.replace(/\/$/, "")}${hash}${title})`;
    }
    env.onBroken?.(target, env.from);
    return text || whole;
  });
}

/** Escapes `<placeholder>` text that is not a real HTML tag, so the markdown parser does not swallow it. */
export function escapeStrayTags(segment: string): string {
  return segment.replace(
    /<\/?([A-Za-z][\w-]*)[^<>]*>/g,
    (m, name: string) => HTML_TAGS.has(name.toLowerCase()) ? m : m.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
  );
}

/** Link rewriting and tag escaping for a whole markdown body. Code fences and inline code are left alone. */
export function processBody(md: string, env: LinkEnv): string {
  let fence = false;
  return md.split("\n").map((line) => {
    if (FENCE.test(line)) {
      fence = !fence;
      return line;
    }
    if (fence) return line;
    return rewriteLinks(line, env).split("`").map((seg, i) => (i % 2 ? seg : escapeStrayTags(seg))).join("`");
  }).join("\n");
}
