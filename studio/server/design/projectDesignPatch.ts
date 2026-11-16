// Applies a validated patch to parsed HTML in the main process (never inside the preview). Any
// selector that does not resolve to exactly one node (or at least one with all:true) rejects the
// whole patch, so a half-applied edit can never be saved. The caller then asks for a full regenerate.
// Bounds: patch file 64 KB, page 2 MB, selector length/complexity limited in parseDesignPatch, and the
// whole application has a time budget checked between operations. Limit: one cheerio selector match is
// synchronous and cannot be interrupted, so the budget is not enforced inside a single long match; what
// bounds it is the selector complexity limits, the 8000-element cap and the 2 MB page cap (measured: 249 ms
// for 3 operations on a 1.96 MB page). Upgrade path: run applyDesignPatch in a worker thread.
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import {
  type DesignManifest,
  type DesignPatch,
  type DesignScreen,
  MAX_DESIGN_HTML_BYTES,
  parseDesignPatch,
} from "../../shared/design/index.ts";
import { readProjectText, writeProjectFile } from "./projectDesignFs.ts";
import { analyzeDesignHtml, sanitizeDesignHtml } from "./projectDesignSanitize.ts";
import { designFilePath, screenDir } from "./projectDesignStore.ts";
import { contentSha, isScriptTrusted } from "./projectDesignTrust.ts";

const MAX_PATCH_BYTES = 64 * 1024;
const PATCH_BUDGET_MS = 1500;
/** Sibling-position selectors (:nth-of-type, from the element picker) cost O(siblings) per candidate: past this many elements a patch is refused and the page is regenerated instead. */
const MAX_PATCH_ELEMENTS = 8000;

export function applyDesignPatch(html: string, patch: DesignPatch, budgetMs = PATCH_BUDGET_MS): string {
  const started = performance.now();
  const $ = cheerio.load(html);
  if ($("*").length > MAX_PATCH_ELEMENTS) throw new Error("This page is too large for a targeted edit; regenerate it in full.");
  for (const [i, op] of patch.ops.entries()) {
    if (performance.now() - started > budgetMs) throw new Error("The patch took too long to apply.");
    const found = $(op.selector);
    if (found.length === 0 || (found.length > 1 && !op.all)) {
      throw new Error(
        `Operation ${i + 1}: "${op.selector}" matched ${found.length} elements, expected ${op.all ? "at least 1" : "exactly 1"}.`,
      );
    }
    switch (op.op) {
      case "classes":
        found.removeClass((op.remove ?? []).join(" ")).addClass((op.add ?? []).join(" "));
        break;
      case "text":
        found.text(op.text);
        break;
      case "inner":
        found.html(sanitizeDesignHtml(op.html, { fragment: true }));
        break;
      case "append":
        found.append(sanitizeDesignHtml(op.html, { fragment: true }));
        break;
      case "remove":
        found.remove();
        break;
      case "attr":
        found.attr(op.name, op.value);
        break;
    }
  }
  if (performance.now() - started > budgetMs) throw new Error("The patch took too long to apply.");
  return $.html();
}

const stemOf = (file: string) => file.replace(/\.html$/, "");
const patchPath = (dir: string, slug: string, file: string) => join(screenDir(dir, slug), `${stemOf(file)}.patch.json`);
const errorPath = (dir: string, slug: string, file: string) => join(screenDir(dir, slug), `${stemOf(file)}.patch-error.txt`);
const mtime = (path: string) => stat(path).then((s) => s.mtimeMs, () => 0);

/**
 * For a step file that is not written yet but has a `.patch.json` beside it: apply the patch to the
 * parent variant. Returns an error message when the patch cannot be applied (shown with a
 * "regenerate in full" action), or null when there is nothing to do or it worked. A missing parent is
 * not an error (it may appear later), and a recorded error is only reused while neither the patch nor
 * the parent changed since.
 */
export async function settlePatch(dir: string, manifest: DesignManifest, file: string, parent: string | undefined): Promise<string | null> {
  if (!parent) return null;
  const source = patchPath(dir, manifest.slug, file);
  const parentPath = designFilePath(dir, manifest.slug, parent);
  if (existsSync(designFilePath(dir, manifest.slug, file)) || !existsSync(source) || !existsSync(parentPath)) return null;
  const failed = errorPath(dir, manifest.slug, file);
  const failedAt = await mtime(failed);
  if (failedAt > 0 && failedAt > (await mtime(source)) && failedAt > (await mtime(parentPath))) {
    return readProjectText(dir, failed, 4096).catch(() => "The patch could not be applied.");
  }
  try {
    const patch = parseDesignPatch(JSON.parse(await readProjectText(dir, source, MAX_PATCH_BYTES)));
    const parentHtml = await readProjectText(dir, parentPath, MAX_DESIGN_HTML_BYTES);
    const scripts = await isScriptTrusted(dir, manifest.slug, parent, contentSha(parentHtml));
    const analysis = analyzeDesignHtml(applyDesignPatch(parentHtml, patch), { allowInlineScripts: scripts });
    if (analysis.problems.length) throw new Error(`The patched page is not acceptable: ${analysis.problems.join(" ")}`);
    await writeProjectFile(dir, designFilePath(dir, manifest.slug, file), analysis.html);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The patch could not be applied.";
    await writeProjectFile(dir, failed, message).catch(() => undefined);
    return message;
  }
}

/** Applies every pending patch in a listing and reports the ones that failed. Returns true when a file was written. */
export async function settlePatches(
  dir: string,
  screens: DesignScreen[],
): Promise<{ wrote: boolean; errors: Map<string, Record<string, string>> }> {
  let wrote = false;
  const errors = new Map<string, Record<string, string>>();
  for (const screen of screens) {
    const written = new Set(screen.files.map((f) => f.file));
    for (const step of screen.manifest.steps) {
      for (const file of step.files.filter((f) => !written.has(f))) {
        const error = await settlePatch(dir, screen.manifest, file, step.parent);
        if (error) errors.set(screen.slug, { ...errors.get(screen.slug), [file]: error });
        else if (existsSync(designFilePath(dir, screen.slug, file))) wrote = true;
      }
    }
  }
  return { wrote, errors };
}
