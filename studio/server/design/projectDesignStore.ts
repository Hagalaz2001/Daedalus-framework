// Design Studio storage: design/<slug>/design.json plus the variant files the agent (or Stitch) writes.
// Every path is rebuilt here from a validated slug and file name, every read and write goes through the
// symlink-safe helpers, and an unchanged file is never parsed twice (verdict cache keyed by mtime).
import { existsSync } from "node:fs";
import { lstat, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import {
  DESIGN_FOLDER,
  DESIGN_TARGETS,
  type DesignBeginResult,
  type DesignCommand,
  type DesignFileInfo,
  type DesignList,
  type DesignManifest,
  type DesignScreen,
  designStem,
  type DesignStep,
  isDesignFile,
  isSafeDesignName,
  MAX_DESIGN_HTML_BYTES,
  nextRevisionFile,
  parseDesignManifest,
  slugifyDesignName,
} from "../../shared/design/index.ts";
import { readProjectDir, readProjectText, writeProjectFile } from "./projectDesignFs.ts";
import { analyzeDesignHtml } from "./projectDesignSanitize.ts";
import { composeScreen, listShells, loadScreenShell, resolveComposed } from "./projectDesignShells.ts";
import { getVerdict, putVerdict } from "./projectDesignVerdicts.ts";
import { contentSha, isScriptTrusted } from "./projectDesignTrust.ts";

const MAX_SCREENS = 50;
const MAX_EXPORT_FILES = 200;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_MD_BYTES = 100_000;
const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;
const REFERENCE_TYPES: Record<string, { ext: string; magic: readonly number[] }> = {
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
};
const STEP_KINDS = ["generate", "refine", "screens", "fix"] as const;
type Begin = Extract<DesignCommand, { kind: "begin" }>;

export function screenDir(dir: string, slug: unknown): string {
  if (!isSafeDesignName(slug)) throw new Error("Not a design screen name.");
  const root = resolve(dir, DESIGN_FOLDER);
  const full = resolve(root, slug);
  if (!full.startsWith(root + sep)) throw new Error("That folder is not inside this project's design folder.");
  return full;
}

export function designFilePath(dir: string, slug: unknown, file: unknown): string {
  if (!isDesignFile(file)) throw new Error("Not a design file.");
  return join(screenDir(dir, slug), file);
}

export async function readManifest(dir: string, slug: string): Promise<DesignManifest | null> {
  try {
    return parseDesignManifest(
      JSON.parse(await readProjectText(dir, join(screenDir(dir, slug), "design.json"), MAX_MANIFEST_BYTES)),
    );
  } catch {
    return null;
  }
}

export async function writeManifest(dir: string, manifest: DesignManifest): Promise<void> {
  await writeProjectFile(
    dir,
    join(screenDir(dir, manifest.slug), "design.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/** Verdicts by path, mtime, size and script trust: a poll that finds nothing changed parses nothing. */
const verdicts = new Map<string, { problems: string[]; remote: boolean; sha: string }>();
/** How often a page was read and analysed; tests check a poll that changed nothing does neither. */
export const designStoreWork = { reads: 0, parses: 0 };
const MAX_VERDICTS = 400;
/** Bump when projectDesignSanitize.ts or projectDesignPolicy.ts changes (a test fails until you do): persisted verdicts of an older policy must not be reused. */
export const VERDICT_VERSION = "p1";

async function inspectFile(dir: string, manifest: DesignManifest, file: string): Promise<DesignFileInfo | null> {
  const full = designFilePath(dir, manifest.slug, file);
  const info = await lstat(full).catch(() => null);
  if (!info) return null; // Not written yet: the canvas shows it as pending.
  let problems: string[] = [];
  let remote = false;
  let scripts = false;
  let shellId: string | undefined;
  let route: string | undefined;
  if (info.isSymbolicLink() || !info.isFile()) problems = ["Not a regular file."];
  else if (info.size > MAX_DESIGN_HTML_BYTES) problems = ["File is larger than 2 MB."];
  else {
    const cacheKey = `${full}|${info.mtimeMs}|${info.size}`;
    let hit = verdicts.get(cacheKey);
    if (!hit) {
      designStoreWork.reads++;
      const raw = await readProjectText(dir, full, MAX_DESIGN_HTML_BYTES).catch((error: unknown) => {
        problems = [error instanceof Error ? error.message : "Unreadable."];
        return null;
      });
      if (raw !== null) {
        const sha = contentSha(raw);
        scripts = await isScriptTrusted(dir, manifest.slug, file, sha);
        try {
          // A composed page also depends on its shell and route map: its key hashes all three, so it is
          // cached (and persisted) like any page and a poll that changed nothing runs no parser.
          const loaded = await loadScreenShell(dir, raw);
          shellId = loaded?.marker.shellId;
          route = loaded?.marker.route;
          const contentKey = `${VERDICT_VERSION}|${loaded?.key ?? sha}|${scripts ? 1 : 0}`;
          let verdict = await getVerdict(contentKey);
          if (!verdict) {
            await new Promise((done) => setImmediate(done)); // yield between parses so many large files cannot stall the main process
            const html = loaded ? composeScreen(loaded.shell.html, raw, loaded.shell.map, loaded.marker.route) : raw;
            designStoreWork.parses++;
            const analysis = analyzeDesignHtml(html, { allowInlineScripts: scripts });
            verdict = { problems: analysis.problems, remote: analysis.remote };
            await putVerdict(contentKey, verdict);
          }
          hit = { ...verdict, sha };
          if (!loaded) {
            if (verdicts.size >= MAX_VERDICTS) verdicts.clear();
            verdicts.set(cacheKey, hit);
          }
        } catch (error) {
          problems = [error instanceof Error ? error.message : "The shell cannot be used."];
        }
      }
    } else scripts = await isScriptTrusted(dir, manifest.slug, file, hit.sha);
    if (hit) {
      problems = hit.problems;
      remote = hit.remote && problems.length > 0;
    }
  }
  const stem = designStem(file);
  const image = ["png", "jpg"].map((ext) => `${stem}.${ext}`).find((name) =>
    existsSync(join(screenDir(dir, manifest.slug), name))
  );
  return {
    file,
    modifiedAt: info.mtime.toISOString(),
    ok: problems.length === 0,
    problems,
    scripts,
    ...(image ? { image } : {}),
    ...(remote ? { remote } : {}),
    ...(shellId ? { shellId, route } : {}),
  };
}

async function listExports(dir: string, slug: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (folder: string, prefix: string): Promise<void> => {
    for (const entry of await readProjectDir(dir, folder)) {
      if (found.length >= MAX_EXPORT_FILES) return;
      if (entry.isDirectory) await walk(join(folder, entry.name), `${prefix}${entry.name}/`);
      else found.push(`${prefix}${entry.name}`);
    }
  };
  await walk(join(screenDir(dir, slug), "export"), "");
  return found.sort();
}

const mdCache = new Map<string, { at: string; text: string | null }>();

async function readDesignMd(dir: string): Promise<string | null> {
  const full = join(dir, "DESIGN.md");
  const info = await lstat(full).catch(() => null);
  if (!info || info.isSymbolicLink() || !info.isFile() || info.size > MAX_MD_BYTES) return null;
  const at = `${info.mtimeMs}|${info.size}`;
  const cached = mdCache.get(full);
  if (cached?.at === at) return cached.text;
  const text = await readProjectText(dir, full, MAX_MD_BYTES).catch(() => null);
  mdCache.set(full, { at, text });
  return text;
}

export async function listDesigns(dir: string): Promise<DesignList> {
  const designMd = await readDesignMd(dir);
  const hasDesignMd = designMd !== null || existsSync(join(dir, "DESIGN.md"));
  const names = (await readProjectDir(dir, join(dir, DESIGN_FOLDER))).filter((e) => e.isDirectory).map((e) => e.name);
  if (names.length === 0) return { screens: [], hasDesignMd, shells: await listShells(dir), designMd };
  const screens = await Promise.all(
    names.filter(isSafeDesignName).slice(0, MAX_SCREENS).map(async (slug): Promise<DesignScreen | null> => {
      const manifest = await readManifest(dir, slug);
      if (!manifest) return null;
      const wanted = [...new Set(manifest.steps.flatMap((step) => step.files))];
      const files = (await Promise.all(wanted.map((file) => inspectFile(dir, manifest, file)))).filter((
        f,
      ): f is DesignFileInfo => f !== null);
      return { slug, manifest, files, exports: await listExports(dir, slug) };
    }),
  );
  return {
    screens: screens.filter((s): s is DesignScreen => s !== null).sort((a, b) =>
      b.manifest.created.localeCompare(a.manifest.created)
    ),
    hasDesignMd,
    shells: await listShells(dir),
    designMd,
  };
}

/** The sanitised, canonical HTML of one variant. Throws with the reasons when it fails the gate. */
export async function readDesign(dir: string, slug: unknown, file: unknown): Promise<string> {
  const manifest = await readManifest(dir, String(slug));
  if (!manifest) throw new Error("This screen has no design.json.");
  const path = designFilePath(dir, slug, file);
  const raw = await readProjectText(dir, path, MAX_DESIGN_HTML_BYTES);
  const scripts = await isScriptTrusted(dir, manifest.slug, String(file), contentSha(raw));
  const { html } = await resolveComposed(dir, raw);
  const analysis = analyzeDesignHtml(html, { allowInlineScripts: scripts });
  if (analysis.problems.length) throw new Error(analysis.problems.join(" "));
  return analysis.html;
}

async function freeSlug(dir: string, name: string): Promise<string> {
  const base = slugifyDesignName(name);
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`.slice(0, 48);
    if (!(await stat(screenDir(dir, slug)).then(() => true, () => false))) return slug;
  }
  throw new Error("Too many screens with that name.");
}

const stepId = () => `s${Date.now().toString(36)}`;

/** Records what the agent is about to do and tells it which files to write. */
export async function beginStep(dir: string, cmd: Begin): Promise<DesignBeginResult> {
  if (!STEP_KINDS.includes(cmd.step)) throw new Error("Unknown step.");
  const created = new Date().toISOString();
  if (cmd.step === "generate") {
    const brief = (cmd.brief ?? "").trim();
    if (!brief || brief.length > 8000) throw new Error("Write a brief of up to 8000 characters.");
    if (!cmd.target || !DESIGN_TARGETS.includes(cmd.target)) throw new Error("Pick a target.");
    const wanted = cmd.count ?? 3;
    if (!Number.isInteger(wanted) || wanted < 1 || wanted > 5) throw new Error("Ask for 1 to 5 variants.");
    if ((await listDesigns(dir)).screens.length >= MAX_SCREENS) throw new Error("This project already has 50 screens.");
    const slug = await freeSlug(dir, cmd.name?.trim() || brief.slice(0, 40));
    const step: DesignStep = {
      id: stepId(),
      kind: "generate",
      instruction: brief,
      created,
      files: Array.from({ length: wanted }, (_, i) => `v${i + 1}.html`),
    };
    const reference = cmd.reference ? await saveReference(dir, slug, cmd.reference) : undefined;
    await writeManifest(dir, {
      version: 1,
      slug,
      brief,
      target: cmd.target,
      model: "model",
      engine: "model",
      created,
      ...(reference ? { reference } : {}),
      steps: [step],
    });
    return { slug, step };
  }
  const manifest = await readManifest(dir, String(cmd.slug));
  if (!manifest) throw new Error("Unknown design screen.");
  const parent = isDesignFile(cmd.parent) ? cmd.parent : undefined;
  if (!parent) throw new Error("Pick a variant first.");
  const taken = [...new Set(manifest.steps.flatMap((s) => s.files))];
  let files: string[];
  let instruction = (cmd.instruction ?? "").trim();
  if (cmd.step === "screens") {
    const names = [...new Set((cmd.names ?? []).map((n) => slugifyDesignName(n, "")).filter(Boolean))].slice(0, 6);
    files = names.map((n) => `s-${n}.html`).filter((f) => !taken.includes(f));
    if (!files.length) throw new Error("Name at least one new screen.");
    instruction = names.join(", ");
  } else {
    if (!instruction || instruction.length > 4000) throw new Error("Write an instruction of up to 4000 characters.");
    files = [nextRevisionFile(parent, taken, cmd.step)];
  }
  const mode = cmd.step === "screens" ? undefined : cmd.mode === "full" ? "full" : "surgical";
  const step: DesignStep = {
    id: stepId(),
    kind: cmd.step,
    instruction,
    created,
    parent,
    files,
    ...(mode ? { mode } : {}),
  };
  await writeManifest(dir, { ...manifest, steps: [...manifest.steps, step] });
  return { slug: manifest.slug, step };
}

export async function saveReference(
  dir: string,
  slug: string,
  ref: { mime: string; bytes: Uint8Array },
): Promise<string> {
  const type = REFERENCE_TYPES[ref.mime];
  const valid = type &&
    ref.bytes instanceof Uint8Array &&
    ref.bytes.length > 0 &&
    ref.bytes.length <= MAX_REFERENCE_BYTES &&
    type.magic.every((byte, i) => ref.bytes[i] === byte);
  if (!type || !valid) throw new Error("The reference must be a PNG, JPEG or WebP image up to 5 MB.");
  const name = `reference.${type.ext}`;
  await writeProjectFile(dir, join(screenDir(dir, slug), name), ref.bytes);
  return name;
}
