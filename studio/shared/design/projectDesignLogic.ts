// Pure Design Studio logic: names, manifest validation, and the HTML gate that every design
// (model output or Stitch download) must pass before the renderer may preview it.
import { DESIGN_TARGETS, type DesignManifest, type DesignStep, type DesignStepKind } from "./projectDesign.ts";

export const MAX_DESIGN_HTML_BYTES = 2 * 1024 * 1024;
const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function slugifyDesignName(text: string, fallback = "screen"): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || fallback;
}

export const isSafeDesignName = (name: unknown): name is string => typeof name === "string" && SAFE_NAME.test(name);

/** A design file is "<name>.html" with a safe name; nothing else may be read or written by main. */
export const isDesignFile = (file: unknown): file is string =>
  typeof file === "string" && file.endsWith(".html") && isSafeDesignName(file.slice(0, -5));

/** The variant a file descends from: "v1-r2.html" and "v1-fix1.html" both belong to "v1". */
export const designStem = (file: string) => file.replace(/\.html$/, "").replace(/-(r|fix)\d+$/, "");

/** Next free file name for a change to `parent`: v1.html -> v1-r1.html -> v1-r2.html. */
export function nextRevisionFile(parent: string, existing: readonly string[], kind: "refine" | "fix"): string {
  const stem = designStem(parent);
  const tag = kind === "fix" ? "fix" : "r";
  let n = 1;
  while (existing.includes(`${stem}-${tag}${n}.html`)) n++;
  return `${stem}-${tag}${n}.html`;
}

const KINDS: readonly DesignStepKind[] = ["generate", "refine", "screens", "fix"];

function parseStep(raw: unknown): DesignStep | null {
  const s = raw as Partial<DesignStep> | null;
  if (!s || typeof s.id !== "string" || !KINDS.includes(s.kind as DesignStepKind)) return null;
  if (typeof s.instruction !== "string" || typeof s.created !== "string" || !Array.isArray(s.files)) return null;
  const files = s.files.filter(isDesignFile);
  const parent = isDesignFile(s.parent) ? s.parent : undefined;
  const mode = s.mode === "surgical" || s.mode === "full" ? s.mode : undefined;
  return {
    id: s.id,
    kind: s.kind as DesignStepKind,
    instruction: s.instruction,
    created: s.created,
    files,
    ...(parent ? { parent } : {}),
    ...(mode ? { mode } : {}),
  };
}

/** Returns null for anything that is not a well-formed manifest, so a hand-edited file never crashes the studio. */
export function parseDesignManifest(raw: unknown): DesignManifest | null {
  const m = raw as Partial<DesignManifest> | null;
  if (!m || m.version !== 1 || !isSafeDesignName(m.slug)) return null;
  if (typeof m.brief !== "string" || typeof m.model !== "string" || typeof m.created !== "string") return null;
  if (!DESIGN_TARGETS.includes(m.target as never) || (m.engine !== "model" && m.engine !== "stitch")) return null;
  if (!Array.isArray(m.steps)) return null;
  const steps = m.steps.map(parseStep).filter((step): step is DesignStep => step !== null);
  return {
    version: 1,
    slug: m.slug,
    brief: m.brief,
    target: m.target as DesignManifest["target"],
    model: m.model,
    engine: m.engine,
    created: m.created,
    ...(typeof m.reference === "string" && /^reference\.(png|jpe?g|webp)$/.test(m.reference) ? { reference: m.reference } : {}),
    steps,
  };
}
