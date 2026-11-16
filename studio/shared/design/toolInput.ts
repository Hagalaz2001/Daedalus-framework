// Reads the string members of a possibly incomplete JSON object (a streamed tool call), so the canvas can build a page while the model is still writing it.

export interface PartialJsonString {
  value: string;
  /** False while the closing quote has not arrived yet. */
  closed: boolean;
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  "/": "/",
  "\\": "\\",
  '"': '"',
};

/** Reads one JSON string starting after its opening quote. A trailing half-written escape is dropped, never guessed. */
export function readString(raw: string, start: number): { value: string; closed: boolean; end: number } {
  let value = "";
  let i = start;
  while (i < raw.length) {
    const char = raw[i]!;
    if (char === '"') return { value, closed: true, end: i + 1 };
    if (char !== "\\") {
      value += char;
      i += 1;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) break; // dangling backslash
    if (next === "u") {
      const hex = raw.slice(i + 2, i + 6);
      if (hex.length < 4) break; // \u escape cut in half
      const code = Number.parseInt(hex, 16);
      value += Number.isNaN(code) ? "" : String.fromCharCode(code);
      i += 6;
      continue;
    }
    value += SIMPLE_ESCAPES[next] ?? next;
    i += 2;
  }
  return { value, closed: false, end: raw.length };
}

/** Skips a non-string value (number, boolean, null, object, array) up to the comma or brace that ends it. */
function skipValue(raw: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < raw.length) {
    const char = raw[i]!;
    if (char === '"') i = readString(raw, i + 1).end - 1;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      if (depth === 0) return i;
      depth -= 1;
    } else if (char === "," && depth === 0) return i;
    i += 1;
  }
  return raw.length;
}

/**
 * The string members of the top-level object in a possibly incomplete JSON text. Only members of the outer
 * object count (a "path" inside the file content is never mistaken for the path argument).
 */
export function readPartialJsonStrings(raw: string, keys: readonly string[]): Record<string, PartialJsonString> {
  const found: Record<string, PartialJsonString> = {};
  let i = raw.indexOf("{");
  if (i < 0) return found;
  i += 1;
  while (i < raw.length) {
    while (i < raw.length && /[\s,]/.test(raw[i]!)) i += 1;
    if (raw[i] !== '"') break;
    const key = readString(raw, i + 1);
    if (!key.closed) break;
    i = key.end;
    while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
    if (raw[i] !== ":") break;
    i += 1;
    while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
    if (raw[i] === '"') {
      const value = readString(raw, i + 1);
      if (keys.includes(key.value)) found[key.value] = { value: value.value, closed: value.closed };
      if (!value.closed) break;
      i = value.end;
    } else i = skipValue(raw, i);
  }
  return found;
}

/**
 * The files a streamed `write_designs` call has produced so far: [{file, html, closed}]. Scans for each
 * `"file":"x.html","html":"` pair and reads the html string up to what has arrived.
 */
export function readPartialDesigns(raw: string): { file: string; html: string; closed: boolean }[] {
  const out: { file: string; html: string; closed: boolean }[] = [];
  let at = 0;
  for (;;) {
    const key = raw.indexOf('"file"', at);
    if (key < 0) break;
    const m = /^"file"\s*:\s*"([a-z0-9][a-z0-9-]*\.html)"\s*,\s*"html"\s*:\s*"/.exec(raw.slice(key, key + 160));
    if (!m) {
      at = key + 6;
      continue;
    }
    const body = readString(raw, key + m[0].length);
    out.push({ file: m[1]!, html: body.value, closed: body.closed });
    if (!body.closed) break;
    at = body.end;
  }
  return out;
}
