// A small JSON Schema validator for tool input: type, properties, required, items, enum, maxItems, additionalProperties:false.
// Used for models without strict structured output (local models): the answer is validated and, if wrong, sent back once.
// shortcut: no $ref, oneOf or format; the studio's own tool schemas do not use them. Upgrade to a full validator if they do.

type Schema = Record<string, unknown>;

/** Returns a list of problems with `value`, each prefixed by its path; empty when valid. */
export function validateJson(value: unknown, schema: Schema, path = "$"): string[] {
  const problems: string[] = [];
  const type = schema.type as string | undefined;
  const kind = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    problems.push(`${path}: must be one of ${JSON.stringify(schema.enum)}`);
  }
  if (type && !(type === "integer" ? Number.isInteger(value) : type === kind)) {
    problems.push(`${path}: expected ${type}, got ${kind}`);
    return problems;
  }
  if (type === "object" && value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, Schema>;
    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (!(key in obj)) problems.push(`${path}.${key}: missing`);
    }
    for (const [key, v] of Object.entries(obj)) {
      if (props[key]) problems.push(...validateJson(v, props[key]!, `${path}.${key}`));
      else if (schema.additionalProperties === false) problems.push(`${path}.${key}: not allowed`);
    }
  }
  if (type === "array" && Array.isArray(value)) {
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      problems.push(`${path}: at most ${schema.maxItems} items`);
    }
    if (schema.items) {
      value.forEach((v, i) => problems.push(...validateJson(v, schema.items as Schema, `${path}[${i}]`)));
    }
  }
  return problems;
}

/** The first JSON object in a model answer, tolerating code fences and text around it. Throws when there is none. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const candidates = [text.trim(), fenced?.trim()].filter((s): s is string => !!s);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // try the next candidate
    }
  }
  throw new Error("No JSON object in the answer.");
}
