// Design directions on disk (see packages/shared/src/projectDesignDirections.ts for the layout). Same rules
// as the rest of the studio: symlink-safe reads and writes, every page through the parser allowlist, and a
// verdict cache so a poll that finds nothing changed parses nothing.
import { lstat, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  type DirectionFileStatus,
  DIRECTIONS_FOLDER,
  type DirectionSelection,
  type DirectionSet,
  type DirectionsInput,
  type DirectionsView,
  isSafeDesignName,
  MAX_DESIGN_HTML_BYTES,
  parseDirectionSelection,
  parseDirectionSet,
  parseRouteMap,
  planDirections,
  routeMapFor,
  SELECTION_FILE,
} from "../../shared/design/index.ts";
import { readProjectText, writeProjectFile } from "./projectDesignFs.ts";
import { analyzeDesignHtml } from "./projectDesignSanitize.ts";

const SET_FILE = `${DIRECTIONS_FOLDER}/directions.json`;
const MAX_JSON_BYTES = 256 * 1024;
const MAX_MD_BYTES = 100_000;
const verdicts = new Map<string, DirectionFileStatus>();
const MAX_VERDICTS = 600;

const readJson = async (dir: string, relative: string): Promise<unknown> => {
  try {
    return JSON.parse(await readProjectText(dir, join(dir, relative), MAX_JSON_BYTES));
  } catch {
    return null;
  }
};

async function screenStatus(dir: string, relative: string, screen: string): Promise<DirectionFileStatus | null> {
  const full = join(dir, relative);
  const info = await lstat(full).catch(() => null);
  if (!info) return null;
  const key = `${full}|${info.mtimeMs}|${info.size}`;
  const cached = verdicts.get(key);
  if (cached) return cached;
  let problems: string[];
  if (info.isSymbolicLink() || !info.isFile()) problems = ["Not a regular file."];
  else if (info.size > MAX_DESIGN_HTML_BYTES) problems = ["File is larger than 2 MB."];
  else problems = analyzeDesignHtml(await readProjectText(dir, full, MAX_DESIGN_HTML_BYTES).catch(() => "")).problems;
  const status: DirectionFileStatus = {
    screen,
    ok: problems.length === 0,
    problems,
    modifiedAt: info.mtime.toISOString(),
  };
  if (verdicts.size >= MAX_VERDICTS) verdicts.clear();
  verdicts.set(key, status);
  return status;
}

export async function listDirections(dir: string): Promise<DirectionsView> {
  const set = parseDirectionSet(await readJson(dir, SET_FILE));
  const selection = parseDirectionSelection(await readJson(dir, SELECTION_FILE));
  if (!set) return { set: null, files: {}, designMd: {}, routeMap: null, selection };
  let routeMap = null;
  try {
    routeMap = parseRouteMap(await readJson(dir, set.routes));
  } catch {
    routeMap = null;
  }
  const files: DirectionsView["files"] = {};
  const designMd: DirectionsView["designMd"] = {};
  await Promise.all(
    set.directions.map(async (direction) => {
      files[direction.id] = (await Promise.all(direction.screens.map((screen) =>
        screenStatus(dir, screen.file, screen.id)
      ))).filter((
        s,
      ): s is DirectionFileStatus => s !== null);
      const md = await lstat(join(dir, direction.designMd)).catch(() => null);
      designMd[direction.id] = Boolean(md && md.isFile() && !md.isSymbolicLink() && md.size > 0);
    }),
  );
  return { set, files, designMd, routeMap, selection };
}

/** Plans the set and writes directions.json and the shared route map. Refuses while a direction is locked. */
export async function beginDirections(dir: string, input: DirectionsInput): Promise<DirectionSet> {
  if (parseDirectionSelection(await readJson(dir, SELECTION_FILE))) {
    throw new Error("A direction is locked. Unlock it before generating new directions.");
  }
  const set = planDirections(input, new Date().toISOString());
  const routes = parseRouteMap(routeMapFor(set));
  await writeProjectFile(dir, join(dir, set.routes), `${JSON.stringify(routes, null, 2)}\n`);
  await writeProjectFile(dir, join(dir, SET_FILE), `${JSON.stringify(set, null, 2)}\n`);
  return set;
}

export async function writeDirectionDesignMd(dir: string, id: unknown, text: unknown): Promise<{ file: string }> {
  const set = parseDirectionSet(await readJson(dir, SET_FILE));
  const direction = set?.directions.find((d) => d.id === id);
  if (!direction) throw new Error("Unknown direction.");
  if (
    typeof text !== "string" || !text.startsWith("---\n") || text.length > MAX_MD_BYTES || !text.includes("\ncolors:")
  ) {
    throw new Error("That is not a DESIGN.md with colour tokens.");
  }
  await writeProjectFile(dir, join(dir, direction.designMd), text);
  return { file: direction.designMd };
}

/** The sanitised page of one direction's screen, or throws with the reasons. */
export async function readDirectionScreen(dir: string, id: unknown, screen: unknown): Promise<string> {
  if (!isSafeDesignName(id) || !isSafeDesignName(screen)) throw new Error("Not a direction screen.");
  const set = parseDirectionSet(await readJson(dir, SET_FILE));
  const entry = set?.directions.find((d) => d.id === id)?.screens.find((s) => s.id === screen);
  if (!entry) throw new Error("Unknown direction screen.");
  const analysis = analyzeDesignHtml(await readProjectText(dir, join(dir, entry.file), MAX_DESIGN_HTML_BYTES));
  if (analysis.problems.length) throw new Error(analysis.problems.join(" "));
  return analysis.html;
}

/** Locks a direction: writes design/selected.json for engineering. Needs the DESIGN.md and every screen in place and clean. */
export async function selectDirection(dir: string, directionId: unknown, notes?: unknown): Promise<DirectionSelection> {
  const view = await listDirections(dir);
  if (!view.set) throw new Error("There are no directions to pick from.");
  if (view.selection) throw new Error("A direction is already locked. Unlock it first.");
  const direction = view.set.directions.find((d) => d.id === directionId);
  if (!direction) throw new Error("Unknown direction.");
  if (typeof notes !== "undefined" && (typeof notes !== "string" || notes.length > 4000)) {
    throw new Error("Notes can be up to 4000 characters.");
  }
  const missing: string[] = [];
  if (!view.designMd[direction.id]) missing.push("DESIGN.md");
  if (!view.routeMap) missing.push("the route map");
  const statuses = new Map((view.files[direction.id] ?? []).map((s) => [s.screen, s]));
  for (const screen of direction.screens) {
    const status = statuses.get(screen.id);
    if (!status) missing.push(`${screen.title} (not written yet)`);
    else if (!status.ok) missing.push(`${screen.title} (blocked: ${status.problems.join(" ")})`);
  }
  if (missing.length) throw new Error(`This direction is not complete: ${missing.join("; ")}.`);
  const selection: DirectionSelection = {
    version: 1,
    directionId: direction.id,
    name: direction.name,
    brief: view.set.brief,
    stack: view.set.stack,
    designMd: direction.designMd,
    routeMap: view.set.routes,
    screens: direction.screens,
    notes: (notes as string | undefined)?.trim() ?? "",
    lockedAt: new Date().toISOString(),
  };
  await writeProjectFile(dir, join(dir, SELECTION_FILE), `${JSON.stringify(selection, null, 2)}\n`);
  return selection;
}

export async function unlockSelection(dir: string): Promise<void> {
  const full = join(dir, SELECTION_FILE);
  const info = await lstat(full).catch(() => null);
  if (info && info.isFile() && !info.isSymbolicLink()) await rm(full);
}

/** The DESIGN.md text of one direction, for reviewing it or applying it to the project. */
export async function readDirectionDesignMd(dir: string, id: unknown): Promise<string | null> {
  const set = parseDirectionSet(await readJson(dir, SET_FILE));
  const direction = set?.directions.find((d) => d.id === id);
  if (!direction) throw new Error("Unknown direction.");
  return readProjectText(dir, join(dir, direction.designMd), MAX_MD_BYTES).catch(() => null);
}
