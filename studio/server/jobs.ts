// Runs the model work behind a recorded step: one provider call per file, in parallel. Output is sanitised
// before it is written, streamed to the canvas through the event bus, and failures are kept per file so the
// UI can show them. Nothing here writes outside design/<slug>/ (the store helpers enforce that).
import { join } from "node:path";
import { readPartialDesigns } from "../shared/design/toolInput.ts";
import {
  type DesignManifest,
  type DesignStep,
  type DirectionSet,
  MAX_DESIGN_HTML_BYTES,
  parseDesignPatch,
} from "../shared/design/index.ts";
import { buildDesignMd } from "../shared/design/designMdGenerate.ts";
import { readProjectText, writeProjectFile } from "./design/projectDesignFs.ts";
import { settlePatch } from "./design/projectDesignPatch.ts";
import { sanitizeDesignHtml } from "./design/projectDesignSanitize.ts";
import { designFilePath, readManifest, screenDir } from "./design/projectDesignStore.ts";
import { listShells } from "./design/projectDesignShells.ts";
import { listDirections, writeDirectionDesignMd } from "./design/projectDesignDirections.ts";
import type { ProjectContext } from "./context.ts";
import {
  DESIGN_TOOL,
  directionPrompt,
  generatePrompt,
  PATCH_TOOL,
  refinePrompt,
  screensPrompt,
  systemBlocks,
} from "./prompts.ts";
import type { Provider } from "./providers/types.ts";

export type StudioEvent =
  | { type: "write"; key: string; html: string; done: boolean }
  | { type: "job"; id: string; state: "running" | "done" | "error"; message?: string }
  | { type: "local-ai"; progress: import("./localAi.ts").LocalProgress | null };

export interface Bus {
  emit(event: StudioEvent): void;
}

export interface JobState {
  state: "running" | "done" | "error";
  /** Per file: the reason it failed. */
  errors: Record<string, string>;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

export function createJobs(deps: { ctx: () => ProjectContext; provider: Provider; bus: Bus }) {
  const { provider, bus } = deps;
  const states = new Map<string, JobState>();
  const running = new Set<Promise<void>>();

  const track = (id: string, work: (fail: (file: string, e: unknown) => void) => Promise<void>) => {
    const state: JobState = { state: "running", errors: {} };
    states.set(id, state);
    bus.emit({ type: "job", id, state: "running" });
    const p = work((file, e) => void (state.errors[file] = message(e)))
      .catch((e) => void (state.errors["*"] = message(e)))
      .finally(() => {
        state.state = Object.keys(state.errors).length ? "error" : "done";
        bus.emit({
          type: "job",
          id,
          state: state.state,
          ...(state.state === "error" ? { message: Object.values(state.errors)[0] } : {}),
        });
        running.delete(p);
      });
    running.add(p);
  };

  /** One call that returns a single design file; streams partial html to the canvas under `key`. */
  async function writeOne(
    slug: string,
    file: string,
    call: (onPartial: (raw: string) => void) => Promise<unknown>,
    save: (file: string, html: string) => Promise<void>,
  ) {
    const key = `${slug}/${file}`;
    const result = (await call((raw) => {
      const hit = readPartialDesigns(raw).find((f) => f.file === file);
      if (hit) bus.emit({ type: "write", key, html: hit.html, done: false });
    })) as { files?: { file: string; html: string }[] };
    const out = result.files?.find((f) => f.file === file) ?? result.files?.[0];
    if (!out || typeof out.html !== "string") throw new Error("The model returned no design.");
    if (out.html.length > MAX_DESIGN_HTML_BYTES) throw new Error("The design is larger than 2 MB.");
    await save(file, sanitizeDesignHtml(out.html));
    bus.emit({ type: "write", key, html: out.html, done: true });
  }

  const saveTo = (dir: string, slug: string) => (file: string, html: string) =>
    writeProjectFile(dir, designFilePath(dir, slug, file), html);

  async function runStep(dir: string, slug: string, stepId: string): Promise<void> {
    const manifest = await readManifest(dir, slug);
    const step = manifest?.steps.find((s) => s.id === stepId);
    if (!manifest || !step) throw new Error("Unknown step.");
    const system = systemBlocks(deps.ctx());
    const save = saveTo(dir, slug);
    track(`${slug}/${stepId}`, async (fail) => {
      const parentHtml = step.parent
        ? await readProjectText(dir, designFilePath(dir, slug, step.parent), MAX_DESIGN_HTML_BYTES).catch(() => "")
        : "";
      const image = manifest.reference ? await readReference(dir, slug, manifest.reference) : undefined;
      const full = async (file: string, user: string) =>
        writeOne(
          slug,
          file,
          (onPartial) => provider.call({ system, user, tool: DESIGN_TOOL, onPartial, ...(image ? { image } : {}) }),
          save,
        );
      await Promise.all(
        step.files.map(async (file, i) => {
          try {
            if (step.kind === "generate") {
              await full(file, generatePrompt(manifest, slug, file, { index: i, total: step.files.length }));
            } else if (step.kind === "screens") {
              const shell = (await listShells(dir))[0];
              await full(
                file,
                screensPrompt(
                  parentHtml,
                  manifest,
                  { files: [file], instruction: step.instruction },
                  shell ? { id: shell.id, routes: shell.map.routes.map((r) => r.id) } : undefined,
                ),
              );
            } else if (step.mode === "surgical") {
              try {
                await patchOne(dir, manifest, step, file, parentHtml, system);
              } catch {
                // A patch that does not apply escalates to a full rewrite of the same file.
                await full(file, refinePrompt(parentHtml, manifest, { ...step, mode: "full" }));
              }
            } else await full(file, refinePrompt(parentHtml, manifest, step));
          } catch (e) {
            fail(file, e);
          }
        }),
      );
    });
  }

  async function patchOne(
    dir: string,
    manifest: DesignManifest,
    step: DesignStep,
    file: string,
    parentHtml: string,
    system: ReturnType<typeof systemBlocks>,
  ) {
    const raw = await provider.call({ system, user: refinePrompt(parentHtml, manifest, step), tool: PATCH_TOOL });
    const patch = parseDesignPatch(raw);
    await writeProjectFile(
      dir,
      join(screenDir(dir, manifest.slug), `${file.replace(/\.html$/, "")}.patch.json`),
      JSON.stringify(patch),
    );
    const error = await settlePatch(dir, manifest, file, step.parent);
    if (error) throw new Error(error);
    bus.emit({ type: "write", key: `${manifest.slug}/${file}`, html: "", done: true });
  }

  /** Directions: DESIGN.md from the seed colour (deterministic), then one model call per screen of every direction. */
  async function runDirections(dir: string): Promise<void> {
    const view = await listDirections(dir);
    const set: DirectionSet | null = view.set;
    if (!set) throw new Error("No directions recorded.");
    const system = systemBlocks(deps.ctx());
    track("directions", async (fail) => {
      const mds = new Map<string, string>();
      for (const d of set.directions) {
        const md = await buildDesignMd({ name: `${deps.ctx().name} ${d.name}`, seed: d.seed });
        await writeDirectionDesignMd(dir, d.id, md);
        mds.set(d.id, md);
      }
      await Promise.all(
        set.directions.flatMap((d) =>
          d.screens.map(async (s) => {
            const key = `directions/${d.id}/${s.id}`;
            try {
              const result = (await provider.call({
                system,
                user: directionPrompt(set, d.id, mds.get(d.id)!).replace(
                  /Return exactly these \d+ files[^:]*:[^\n]*/,
                  `Return exactly these files: ${s.id}.html.`,
                ),
                tool: DESIGN_TOOL,
                onPartial: (raw) => {
                  const hit = readPartialDesigns(raw).find((f) => f.file === `${s.id}.html`);
                  if (hit) bus.emit({ type: "write", key, html: hit.html, done: false });
                },
              })) as { files?: { file: string; html: string }[] };
              const html = result.files?.find((f) => f.file === `${s.id}.html`)?.html ?? result.files?.[0]?.html;
              if (typeof html !== "string") throw new Error("The model returned no design.");
              await writeProjectFile(dir, join(dir, s.file), sanitizeDesignHtml(html));
              bus.emit({ type: "write", key, html, done: true });
            } catch (e) {
              fail(key, e);
            }
          })
        ),
      );
    });
  }

  /** Registers the starting work too, so idle() also waits for jobs that have not reached track() yet. */
  const registered = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => (...a: A): Promise<void> => {
    const p = fn(...a);
    running.add(p);
    void p.finally(() => running.delete(p)).catch(() => undefined);
    return p;
  };

  return {
    runStep: registered(runStep),
    runDirections: registered(runDirections),
    state: (id: string) => states.get(id) ?? null,
    all: () => Object.fromEntries(states),
    /** Resolves when every started job finished (tests). */
    idle: async () => {
      while (running.size) await Promise.all([...running]);
    },
  };
}

async function readReference(
  dir: string,
  slug: string,
  name: string,
): Promise<{ mime: string; base64: string } | undefined> {
  try {
    const bytes = await Deno.readFile(join(screenDir(dir, slug), name));
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return {
      mime: name.endsWith("png") ? "image/png" : name.endsWith("webp") ? "image/webp" : "image/jpeg",
      base64: btoa(bin),
    };
  } catch {
    return undefined;
  }
}
