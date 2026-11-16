// Progressive rendering of a page that is still being written. Given any prefix of the HTML it
// returns a complete-elements-only body in Stitch's order of appearance: design tokens first (the
// canvas colours switch), then the shell (header, nav), then content blocks top to bottom.
// One linear scan (indexOf loops, no backtracking regex), so a hostile prefix cannot stall the
// renderer. The result is RAW: the caller passes it through the DOM sanitiser before anything shows.

export type StreamStage = "tokens" | "frame" | "content" | "done";
export type StreamStatus = { kind: "tokens" } | { kind: "frame" } | { kind: "section"; name: string } | {
  kind: "content";
} | {
  kind: "done";
};

export interface StreamFrame {
  /** Complete rules from the page's <style>, so colours apply before any markup exists. */
  css: string;
  /** The body so far: complete elements only, open containers closed. Not yet sanitised. */
  body: string;
  stage: StreamStage;
  status: StreamStatus;
  blocks: number;
}

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const SHELL = new Set(["header", "nav", "aside"]);
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const MAX_PARTIAL_CHARS = 2_000_000;
const NAME = /^[a-z][a-z0-9-]*/;
/** Real pages nest a few dozen levels; past this the scan stops (and the stack copy at each mark stays small). */
const MAX_STREAM_DEPTH = 256;

/** Index just past the ">" that ends the tag starting at `from`, skipping quoted attribute values; -1 when unfinished. */
function tagEnd(source: string, from: number): number {
  let quote = "";
  for (let i = from; i < source.length; i++) {
    const ch = source[i]!;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return i + 1;
  }
  return -1;
}

/** The first complete `<name ...>` after `from` (case-insensitive), or null. */
function findOpenTag(source: string, lower: string, name: string, from = 0): { start: number; end: number } | null {
  for (let at = lower.indexOf(`<${name}`, from); at !== -1; at = lower.indexOf(`<${name}`, at + 1)) {
    const after = lower[at + name.length + 1];
    if (after !== undefined && !/[\s>/]/.test(after)) continue;
    const end = tagEnd(source, at + name.length + 1);
    return end === -1 ? null : { start: at, end };
  }
  return null;
}

/** The last complete rule of a possibly unfinished <style> block. */
function completeCss(source: string, lower: string): string {
  const open = findOpenTag(source, lower, "style");
  if (!open) return "";
  const close = lower.indexOf("</style", open.end);
  const raw = source.slice(open.end, close === -1 ? undefined : close);
  if (close !== -1) return raw;
  let depth = 0;
  let cut = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}" && --depth === 0) cut = i + 1;
  }
  return raw.slice(0, cut);
}

export function progressiveDocument(input: string, finished = false): StreamFrame {
  const partial = input.length > MAX_PARTIAL_CHARS ? input.slice(0, MAX_PARTIAL_CHARS) : input;
  const lowerAll = partial.toLowerCase();
  const css = completeCss(partial, lowerAll);
  const bodyOpen = findOpenTag(partial, lowerAll, "body");
  const empty: StreamFrame = { css, body: "", stage: "tokens", status: { kind: "tokens" }, blocks: 0 };
  if (!bodyOpen) return empty;
  const source = partial.slice(bodyOpen.end);
  const lower = lowerAll.slice(bodyOpen.end);
  const stack: string[] = [];
  let safeEnd = 0;
  let safeStack: string[] = [];
  let section = "";
  let heading = "";
  let blocks = 0;
  let shellSeen = false;
  let headingStart = -1;
  const mark = () => {
    safeEnd = i;
    safeStack = [...stack];
  };
  let i = 0;
  while (i < source.length && stack.length <= MAX_STREAM_DEPTH) {
    const lt = source.indexOf("<", i);
    if (lt === -1) break;
    i = lt;
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i + 4);
      if (end === -1) break;
      const marker = /^\s*section:\s*(.{1,80}?)\s*$/.exec(source.slice(i + 4, Math.min(end, i + 100)));
      if (marker) section = marker[1]!;
      i = end + 3;
      mark();
      continue;
    }
    const closing = source[i + 1] === "/";
    const nameAt = i + (closing ? 2 : 1);
    const name = NAME.exec(lower.slice(nameAt, nameAt + 32))?.[0];
    if (!name) {
      i++;
      continue;
    }
    const end = tagEnd(source, nameAt + name.length);
    if (end === -1) break; // unfinished tag: stop here, nothing after it is complete
    const selfClosing = source[end - 2] === "/";
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at !== -1) {
        stack.length = at;
        i = end;
        mark();
        if (stack.length <= 2) blocks++;
        if (SHELL.has(name)) shellSeen = true;
        if (/^h[1-3]$/.test(name) && headingStart !== -1) {
          heading = source.slice(headingStart, end).replace(/<[^>]*>/g, "").trim().slice(0, 60) || heading;
        }
        continue;
      }
      i = end;
      continue;
    }
    if (/^h[1-3]$/.test(name)) headingStart = end;
    if (RAW_TEXT.has(name) && !selfClosing) {
      const closeAt = lower.indexOf(`</${name}`, end);
      if (closeAt === -1) break;
      const closeEnd = tagEnd(source, closeAt + name.length + 2);
      if (closeEnd === -1) break;
      i = closeEnd;
      mark();
      continue;
    }
    if (!VOID.has(name) && !selfClosing) stack.push(name);
    i = end;
    mark();
  }
  const body = finished ? source : source.slice(0, safeEnd) + [...safeStack].reverse().map((n) => `</${n}>`).join("");
  if (finished) return { css, body, stage: "done", status: { kind: "done" }, blocks };
  const stage: StreamStage = blocks === 0 ? "tokens" : shellSeen ? "content" : "frame";
  const status: StreamStatus = blocks === 0
    ? { kind: "tokens" }
    : !shellSeen
    ? { kind: "frame" }
    : section || heading
    ? { kind: "section", name: section || heading }
    : { kind: "content" };
  return { css, body, stage, status, blocks };
}

/** Cut points for replaying a finished page: roughly one per complete top-level block, at most `steps`. */
export function replayPrefixes(html: string, steps = 14): string[] {
  const lower = html.toLowerCase();
  const body = findOpenTag(html, lower, "body");
  const from = body ? body.end : 0;
  const cuts: number[] = [];
  const closers = [
    "</header>",
    "</nav>",
    "</aside>",
    "</section>",
    "</article>",
    "</footer>",
    "</main>",
    "</ul>",
    "</table>",
    "</form>",
    "</div>",
  ];
  // Next occurrence of each closer, recomputed only when passed: an absent closer is searched once.
  const nexts = closers.map((closer) => lower.indexOf(closer, from));
  for (let at = from; cuts.length < 400;) {
    let nearest = -1;
    let length = 0;
    closers.forEach((closer, k) => {
      if (nexts[k]! !== -1 && nexts[k]! < at) nexts[k] = lower.indexOf(closer, at);
      const found = nexts[k]!;
      if (found !== -1 && (nearest === -1 || found < nearest)) {
        nearest = found;
        length = closer.length;
      }
    });
    if (nearest === -1) break;
    at = nearest + length;
    cuts.push(at);
  }
  const styleEnd = lower.indexOf("</style>");
  const picks = new Set<number>();
  if (styleEnd !== -1) picks.add(styleEnd + 8);
  for (let n = 1; n <= steps; n++) {
    const cut = cuts[Math.floor((cuts.length * n) / steps) - 1];
    if (cut) picks.add(cut);
  }
  return [...picks].sort((a, b) => a - b).map((n) => html.slice(0, n));
}
