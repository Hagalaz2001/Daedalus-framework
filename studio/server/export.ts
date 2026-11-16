// Export: path mapping into the stack's feature folders, a write guard, line diffs, and plan/apply. The model
// never writes files. It returns code; the server turns that into a *plan* (paths + contents), the developer
// reviews the diff, and only then does apply write exactly that plan, nowhere else.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { writeProjectFile } from "./design/projectDesignFs.ts";
import type { AppRef, ProjectContext } from "./context.ts";

export type CodeKind = "react" | "react-native" | "flutter";

/** What a stack declares in its stack.json `export` block; stacks without one (Astro site, Vue SPA: the translator writes React) cannot be exported to. */
export interface ExportInfo {
  kind: CodeKind;
  label: string;
  /** Folder under features/<feature>/ that holds screens. Default "ui"; Flutter uses "presentation". */
  screenDir?: string;
}
const STACKS_DIR = fileURLToPath(new URL("../../stacks/", import.meta.url));
const exportCache = new Map<string, ExportInfo | null>();
export function exportInfoOf(stackId: string): ExportInfo | null {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(stackId)) return null;
  if (!exportCache.has(stackId)) {
    try {
      exportCache.set(
        stackId,
        JSON.parse(readFileSync(join(STACKS_DIR, stackId, "stack.json"), "utf8")).export ?? null,
      );
    } catch {
      exportCache.set(stackId, null);
    }
  }
  return exportCache.get(stackId) ?? null;
}
export const kindOfStack = (stackId: string): CodeKind | undefined => exportInfoOf(stackId)?.kind;

const FEATURE = /^[a-z][a-z0-9-]{0,40}$/;
const SCREEN = /^[A-Z][A-Za-z0-9]{0,60}$/;
const ALLOWED_EXT = new Set([".ts", ".tsx", ".dart", ".json", ".md", ".png"]);
const snake = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

export interface ExportTarget {
  app: AppRef;
  kind: CodeKind;
  feature: string;
  screen: string;
}

/** Where a screen lands: <app>/src/features/<feature>/ui for TypeScript stacks, <app>/lib/features/<feature>/presentation for Flutter. */
export function exportPaths(t: ExportTarget): { screen: string; barrel: string | null } {
  if (!FEATURE.test(t.feature)) throw new Error("Feature names are lowercase words with dashes, for example billing.");
  if (!SCREEN.test(t.screen)) throw new Error("Screen names are PascalCase, for example DashboardScreen.");
  const dir = t.app.dir.replace(/\\/g, "/").replace(/\/+$/, "");
  const sub = exportInfoOf(t.app.stack)?.screenDir ?? (t.kind === "flutter" ? "presentation" : "ui");
  if (t.kind === "flutter") {
    return {
      screen: `${dir}/lib/features/${t.feature}/${sub}/${snake(t.screen)}.dart`,
      barrel: `${dir}/lib/features/${t.feature}/${t.feature}.dart`,
    };
  }
  return {
    screen: `${dir}/src/features/${t.feature}/ui/${t.screen}.tsx`,
    barrel: `${dir}/src/features/${t.feature}/index.ts`,
  };
}

export interface PlannedFile {
  path: string;
  /** UTF-8 text, or base64 when `binary` is set. */
  content: string;
  binary?: boolean;
}

/** Folders a plan may write to: the design folder and docs/screenshots always, plus the feature folders of the project's apps. */
export function allowedPrefixes(ctx: Pick<ProjectContext, "apps">): string[] {
  const apps = ctx.apps.flatMap((a) => [`${a.dir}/src/features/`, `${a.dir}/lib/features/`]);
  return ["design/", "docs/screenshots/", ...apps];
}

/**
 * The single gate every write passes. Returns the normalised relative path or throws. Rejects absolute paths,
 * traversal, .git, node_modules, .env files, extensions outside the allow-list and folders outside the prefixes.
 */
export function guardPath(
  root: string,
  path: string,
  prefixes: readonly string[],
  extraFiles: readonly string[] = ["DESIGN.md"],
): string {
  if (typeof path !== "string" || path === "" || path.length > 300 || path.includes("\0")) {
    throw new Error("Not a valid file path.");
  }
  if (isAbsolute(path) || /^[a-zA-Z]:/.test(path) || path.startsWith("\\\\")) {
    throw new Error(`${path}: paths must be relative to the project.`);
  }
  const rel = normalize(path).replace(/\\/g, "/");
  const segments = rel.split("/");
  if (segments.some((s) => s === ".." || s === "." || s === "")) throw new Error(`${path}: path leaves the project.`);
  if (segments.some((s) => s === ".git" || s === "node_modules" || s.startsWith(".env"))) {
    throw new Error(`${path}: this location is protected.`);
  }
  const full = resolve(root, rel);
  const back = relative(resolve(root), full);
  if (back.startsWith("..") || back.split(sep).includes("..")) throw new Error(`${path}: path leaves the project.`);
  const ext = rel.slice(rel.lastIndexOf("."));
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`${path}: ${ext || "files without an extension"} cannot be written by the studio.`);
  }
  if (!extraFiles.includes(rel) && !prefixes.some((p) => rel.startsWith(p))) {
    throw new Error(`${path}: outside the folders the studio may write to.`);
  }
  return rel;
}

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

/** Line diff by longest common subsequence. shortcut: O(n*m), fine for screen-sized files; cap protects huge inputs. */
export function diffLines(before: string, after: string): DiffLine[] {
  const split = (s: string) => (s === "" ? [] : s.replace(/\n$/, "").split("\n"));
  const a = split(before);
  const b = split(after);
  if (a.length * b.length > 4_000_000) {
    return [...a.map((text) => ({ kind: "del" as const, text })), ...b.map((text) => ({ kind: "add" as const, text }))];
  }
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) out.push({ kind: "same", text: a[i++]! }), j++;
    else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) out.push({ kind: "del", text: a[i++]! });
    else out.push({ kind: "add", text: b[j++]! });
  }
  while (i < a.length) out.push({ kind: "del", text: a[i++]! });
  while (j < b.length) out.push({ kind: "add", text: b[j++]! });
  return out;
}

export interface PlanFileView {
  path: string;
  status: "new" | "changed" | "unchanged";
  binary: boolean;
  bytes: number;
  diff: DiffLine[];
}
export interface PlanView {
  id: string;
  files: PlanFileView[];
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function createPlans(ctxOf: () => ProjectContext, root: string) {
  const plans = new Map<string, PlannedFile[]>();

  async function current(rel: string): Promise<string | null> {
    try {
      const info = await lstat(join(root, rel));
      if (info.isSymbolicLink() || !info.isFile()) throw new Error(`${rel}: not a regular file.`);
      return await readFile(join(root, rel), "utf8");
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT") return null;
      throw e;
    }
  }

  return {
    /** Validates every path, reads what is on disk and returns diffs. Nothing is written. */
    async plan(files: PlannedFile[]): Promise<PlanView> {
      if (!Array.isArray(files) || files.length === 0 || files.length > 40) {
        throw new Error("A plan has 1 to 40 files.");
      }
      const prefixes = allowedPrefixes(ctxOf());
      const clean: PlannedFile[] = [];
      const views: PlanFileView[] = [];
      for (const input of files) {
        let f = input;
        const path = guardPath(root, f.path, prefixes);
        if (clean.some((c) => c.path === path)) throw new Error(`${path}: listed twice.`);
        if (typeof f.content !== "string" || f.content.length > 8_000_000) {
          throw new Error(`${path}: content is missing or too large.`);
        }
        if (!f.binary && /\r\n/.test(f.content)) f = { ...f, content: f.content.replace(/\r\n/g, "\n") };
        const before = f.binary ? null : await current(path);
        clean.push({ path, content: f.content, ...(f.binary ? { binary: true } : {}) });
        views.push({
          path,
          binary: !!f.binary,
          bytes: f.binary ? Math.floor((f.content.length * 3) / 4) : new TextEncoder().encode(f.content).length,
          status: f.binary
            ? ((await current(path).catch(() => null)) === null ? "new" : "changed")
            : before === null
            ? "new"
            : before === f.content
            ? "unchanged"
            : "changed",
          diff: f.binary ? [] : diffLines(before ?? "", f.content),
        });
      }
      const id = randomUUID();
      plans.set(id, clean);
      if (plans.size > 20) plans.delete(plans.keys().next().value as string);
      return { id, files: views };
    },
    /** Writes exactly the plan the developer reviewed. Paths are guarded again; unchanged files are skipped. */
    async apply(id: string): Promise<{ written: string[] }> {
      const files = plans.get(id);
      if (!files) throw new Error("This plan expired. Review the changes again.");
      const prefixes = allowedPrefixes(ctxOf());
      const written: string[] = [];
      for (const f of files) {
        const rel = guardPath(root, f.path, prefixes);
        if (!f.binary && (await current(rel)) === f.content) continue;
        await writeProjectFile(
          root,
          join(root, rel),
          f.binary ? Uint8Array.from(atob(f.content), (c) => c.charCodeAt(0)) : f.content,
        );
        written.push(rel);
      }
      plans.delete(id);
      return { written };
    },
    fingerprint: (files: PlannedFile[]) => sha(JSON.stringify(files)),
  };
}

/** Adds `export * from './ui/<Screen>'` to the feature barrel without touching anything else in it. */
export function withBarrelExport(existing: string | null, screen: string, kind: CodeKind): string {
  const target = kind === "flutter" ? `presentation/${snake(screen)}.dart` : `./ui/${screen}`;
  const line = kind === "flutter" ? `export '${target}';\n` : `export { ${screen} } from '${target}'\n`;
  if (existing === null) return line;
  return existing.includes(`'${target}'`) ? existing : `${existing.replace(/\n*$/, "\n")}${line}`;
}

/** Runs the project's `deno task check` and returns what it printed. Only called after an explicit click. */
export async function runCheck(
  root: string,
  timeoutMs = 600_000,
): Promise<{ ok: boolean; code: number | null; output: string }> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["task", "check"],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    const out = await cmd.output();
    const text = new TextDecoder().decode(out.stdout) + new TextDecoder().decode(out.stderr);
    return { ok: out.success, code: out.code, output: text.slice(-12_000) };
  } catch (e) {
    return { ok: false, code: null, output: e instanceof Error ? e.message : String(e) };
  }
}
