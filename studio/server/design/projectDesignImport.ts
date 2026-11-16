// Two writers outside the model path: a generated DESIGN.md, and a Stitch export folder
// (code.html + DESIGN.md + screen.png) imported as a clearly labelled design.
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { DESIGN_FOLDER } from "../../shared/design/index.ts";
import { readPickedFile, writeProjectFile } from "./projectDesignFs.ts";
import { saveStitchVariant } from "./projectDesignStitch.ts";
import { beginStep, readManifest, writeManifest } from "./projectDesignStore.ts";

const MAX_MD_BYTES = 100_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const MAX_PNG_BYTES = 8 * 1024 * 1024;

/** Never overwrites: a project that already has a DESIGN.md gets the new one beside the designs for review. */
export async function writeDesignMd(dir: string, text: unknown): Promise<{ file: string }> {
  if (typeof text !== "string" || !text.startsWith("---\n") || text.length > MAX_MD_BYTES) {
    throw new Error("That is not a DESIGN.md with front matter.");
  }
  const root = join(dir, "DESIGN.md");
  if (!(await lstat(root).catch(() => null))) {
    await writeProjectFile(dir, root, text);
    return { file: "DESIGN.md" };
  }
  await writeProjectFile(dir, join(dir, DESIGN_FOLDER, "DESIGN.generated.md"), text);
  return { file: `${DESIGN_FOLDER}/DESIGN.generated.md` };
}

export interface ImportedStitch {
  slug: string;
  /** The export's DESIGN.md, held back: it is shown to the person and only written to the project on their confirmation. */
  importedMd: string | null;
}

/** The folder comes from a native picker in main, never from the renderer. Remote assets are stripped; the person can embed them later. */
export async function importStitchExport(dir: string, folder: string): Promise<ImportedStitch> {
  const html = await readPickedFile(join(folder, "code.html"), MAX_HTML_BYTES);
  if (!html) throw new Error("That folder has no code.html (a Stitch export has code.html, DESIGN.md and screen.png).");
  const source = html.toString("utf8");
  // A cheap, bounded guess at "phone-sized": a viewport meta and a narrow max-width class in the first 100 KB.
  const head = source.slice(0, 100_000);
  const mobile = head.includes('name="viewport"') && (head.includes("max-w-sm") || head.includes("max-w-md"));
  const { slug } = await beginStep(dir, {
    kind: "begin",
    step: "generate",
    name: "Stitch import",
    brief: "Imported from a Stitch export.",
    target: mobile ? "web-mobile" : "web-desktop",
    count: 1,
  });
  const manifest = await readManifest(dir, slug);
  if (!manifest) throw new Error("Could not create the screen.");
  await writeManifest(dir, { ...manifest, engine: "stitch", model: "stitch-export" });
  await saveStitchVariant(dir, slug, "v1.html", source, await readPickedFile(join(folder, "screen.png"), MAX_PNG_BYTES));
  const md = await readPickedFile(join(folder, "DESIGN.md"), MAX_MD_BYTES);
  const text = md?.toString("utf8").replace(/\r\n/g, "\n") ?? null;
  const importedMd = text?.startsWith("---\n") ? text : null;
  // Staged inside design/ for the record; the project's own DESIGN.md is not touched until the person confirms.
  if (importedMd) await writeProjectFile(dir, join(dir, DESIGN_FOLDER, "imported", "DESIGN.md"), importedMd);
  return { slug, importedMd };
}
