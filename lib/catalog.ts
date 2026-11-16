// Read-only views of what Daedalus offers: stacks, modules, packs, UI presets, and a search over its documentation.
// Shared by the `list`, `describe` and `docs` CLI commands and the MCP server. No side effects.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listOverlays, listStacks, UsageError } from "./blueprint.ts";

export type ItemKind = "stack" | "module" | "pack" | "preset";

export interface Item {
  kind: ItemKind;
  id: string;
  title: string;
  description: string;
}

const readJson = (f: string) => JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function listPresets(root: string): string[] {
  const dir = join(root, "template", "design", "presets");
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort() : [];
}

function manifestPath(root: string, kind: ItemKind, id: string): string {
  return kind === "stack"
    ? join(root, "stacks", id, "stack.json")
    : kind === "preset"
    ? join(root, "template", "design", "presets", `${id}.json`)
    : join(root, `${kind}s`, id, `${kind}.json`);
}

export function describe(root: string, kind: ItemKind, id: string): Item & { manifest: Record<string, unknown>; readme?: string } {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new UsageError(`Invalid ${kind} id "${id}"`);
  const f = manifestPath(root, kind, id);
  if (!existsSync(f)) throw new UsageError(`Unknown ${kind} "${id}"`);
  const manifest = readJson(f);
  const readmePath = kind === "stack" ? join(root, "stacks", id, existsSync(join(root, "stacks", id, "README.md")) ? "README.md" : "app/README.md") : join(root, `${kind}s`, id, "README.md");
  return {
    kind,
    id,
    title: str(manifest.title) || str(manifest.label) || str(manifest.name) || id,
    description: str(manifest.description) || str(manifest.$comment),
    manifest,
    ...(kind !== "preset" && existsSync(readmePath) ? { readme: readFileSync(readmePath, "utf8") } : {}),
  };
}

export function list(root: string, kind: ItemKind): Item[] {
  const ids = kind === "stack" ? listStacks(root) : kind === "preset" ? listPresets(root) : listOverlays(root, kind);
  return ids.map((id) => {
    const { manifest: _m, readme: _r, ...item } = describe(root, kind, id);
    return item;
  });
}

// ---------- docs ----------
export interface DocRef {
  /** Path relative to the Daedalus checkout, POSIX style. */
  path: string;
  title: string;
}

function walkMd(dir: string, rel: string, out: string[], depth = 0) {
  if (!existsSync(dir) || depth > 4) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "target", "dist", "build", ".dart_tool"].includes(e.name)) continue;
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) walkMd(join(dir, e.name), r, out, depth + 1);
    else if (e.name.endsWith(".md")) out.push(r.slice(1));
  }
}

/** Markdown documents that describe Daedalus itself (not the third-party skill folders). */
export function listDocs(root: string): DocRef[] {
  const paths: string[] = [];
  for (const top of ["README.md", "CONTRIBUTING.md", "DISCLAIMER.md", "SECURITY.md", "CATALOG.md"]) if (existsSync(join(root, top))) paths.push(top);
  for (const d of ["docs", "template/docs", "stacks", "modules", "packs", "studio"]) walkMd(join(root, d), `/${d}`, paths);
  return paths.filter((p) => !p.includes("/node_modules/")).map((path) => ({ path, title: firstHeading(readFileSync(join(root, path), "utf8")) || path }));
}

const firstHeading = (text: string) => /^#\s+(.+)$/m.exec(text)?.[1].trim();

export interface DocHit {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

/** Plain term-frequency search: every query word counts, headings and titles weigh more. Returns the best `limit` documents. */
export function searchDocs(root: string, query: string, limit = 8): DocHit[] {
  const words = query.toLowerCase().split(/[^a-z0-9_.:-]+/).filter((w) => w.length > 1);
  if (!words.length) throw new UsageError("Give a search query");
  const hits: DocHit[] = [];
  for (const doc of listDocs(root)) {
    const text = readFileSync(join(root, doc.path), "utf8");
    const lower = text.toLowerCase();
    let score = 0;
    for (const w of words) {
      score += lower.split(w).length - 1;
      if (doc.title.toLowerCase().includes(w) || doc.path.toLowerCase().includes(w)) score += 10;
    }
    if (!score) continue;
    const lines = text.split("\n");
    const best = lines.findIndex((l) => words.some((w) => l.toLowerCase().includes(w)));
    hits.push({ path: doc.path, title: doc.title, score, snippet: lines.slice(Math.max(0, best), best + 4).join("\n").trim().slice(0, 400) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function readDoc(root: string, path: string): string {
  const known = listDocs(root).find((d) => d.path === path);
  if (!known) throw new UsageError(`Unknown document "${path}"`);
  return readFileSync(join(root, known.path), "utf8");
}
