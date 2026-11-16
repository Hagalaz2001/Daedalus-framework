// Design directions: 3-5 distinct looks for the same product, each with its own DESIGN.md, one shared
// route map and a handful of key screens that adapt to web, iOS and Android. Picking one writes
// design/selected.json, which engineering reads. Files:
//   design/directions/directions.json        the set (this file's DirectionSet)
//   design/directions/routes.json            the shared route map (DesignRouteMap)
//   design/directions/<id>/DESIGN.md         the direction's tokens
//   design/directions/<id>/<screen>.html     one adaptive page per screen (data-platform web|ios|android)
//   design/selected.json                     DirectionSelection, written when a direction is locked
import type { DesignRouteMap } from "./projectDesignShell.ts";
import { isSafeDesignName, slugifyDesignName } from "./projectDesignLogic.ts";

export const DIRECTION_STACKS = ["react-flutter", "react-native"] as const;
export type DirectionStack = (typeof DIRECTION_STACKS)[number];
export const DIRECTION_PLATFORMS = ["web", "ios", "android"] as const;
export type DirectionPlatform = (typeof DIRECTION_PLATFORMS)[number];
export const DIRECTION_FRAMES: Record<DirectionPlatform, { width: number; height: number; radius: number }> = {
  web: { width: 1280, height: 800, radius: 10 },
  ios: { width: 393, height: 852, radius: 48 },
  android: { width: 412, height: 915, radius: 32 },
};
export const DIRECTIONS_FOLDER = "design/directions";
export const SELECTION_FILE = "design/selected.json";

export interface DirectionScreen {
  id: string;
  title: string;
  /** Route id in the shared route map. */
  route: string;
  /** Path of the adaptive page, relative to the project. */
  file: string;
}

export interface DirectionPlan {
  id: string;
  name: string;
  /** The seed colour its DESIGN.md is generated from. */
  seed: string;
  designMd: string;
  screens: DirectionScreen[];
}

export interface DirectionSet {
  version: 1;
  brief: string;
  stack: DirectionStack;
  created: string;
  routes: string;
  directions: DirectionPlan[];
}

export interface DirectionFileStatus {
  screen: string;
  ok: boolean;
  problems: string[];
  modifiedAt: string;
}

export interface DirectionSelection {
  version: 1;
  directionId: string;
  name: string;
  brief: string;
  stack: DirectionStack;
  designMd: string;
  routeMap: string;
  screens: DirectionScreen[];
  /** What to tweak when engineering builds it. */
  notes: string;
  lockedAt: string;
}

export interface DirectionsView {
  set: DirectionSet | null;
  /** Per direction id: which screen files exist and whether they pass the design gate. */
  files: Record<string, DirectionFileStatus[]>;
  /** Per direction id: its DESIGN.md exists. */
  designMd: Record<string, boolean>;
  routeMap: DesignRouteMap | null;
  selection: DirectionSelection | null;
}

export interface DirectionsInput {
  brief: string;
  stack: DirectionStack;
  /** 3-5, default 3. */
  count?: number;
  /** Titles of the key screens (3-6, default five generic ones). */
  screens?: string[];
}

export const DEFAULT_DIRECTION_SCREENS = ["Home", "List", "Detail", "Create", "Settings"];
export const DIRECTION_SEEDS = ["#2f6f5e", "#c2410c", "#1d4ed8", "#a21caf", "#0f766e"];
export const DIRECTION_NAMES = ["Calm", "Bold", "Editorial", "Playful", "Technical"];

/** Plans the set. Pure: ids d1..dN, screens from titles, nothing is written. */
export function planDirections(input: DirectionsInput, created: string): DirectionSet {
  const brief = input.brief.trim();
  if (!brief || brief.length > 8000) throw new Error("Write a brief of up to 8000 characters.");
  if (!DIRECTION_STACKS.includes(input.stack)) throw new Error("Pick react-flutter or react-native.");
  const count = input.count ?? 3;
  if (!Number.isInteger(count) || count < 3 || count > 5) throw new Error("Ask for 3 to 5 directions.");
  const titles = (input.screens?.length ? input.screens : DEFAULT_DIRECTION_SCREENS).map((t) => t.trim()).filter(Boolean);
  const screens = [...new Map(titles.map((title) => [slugifyDesignName(title, "screen"), title])).entries()].slice(0, 6);
  if (screens.length < 3) throw new Error("Name 3 to 6 key screens.");
  return {
    version: 1,
    brief,
    stack: input.stack,
    created,
    routes: `${DIRECTIONS_FOLDER}/routes.json`,
    directions: Array.from({ length: count }, (_, i): DirectionPlan => {
      const id = `d${i + 1}`;
      return {
        id,
        name: DIRECTION_NAMES[i]!,
        seed: DIRECTION_SEEDS[i]!,
        designMd: `${DIRECTIONS_FOLDER}/${id}/DESIGN.md`,
        screens: screens.map(([screenId, title]) => ({
          id: screenId,
          title: title.slice(0, 40),
          route: screenId,
          file: `${DIRECTIONS_FOLDER}/${id}/${screenId}.html`,
        })),
      };
    }),
  };
}

/** The shared route map for a set: the first four screens are tabs, the rest are secondary routes. */
export function routeMapFor(set: DirectionSet): DesignRouteMap {
  const screens = set.directions[0]!.screens;
  return {
    appId: "app",
    defaultRoute: screens[0]!.route,
    navArchetype: "bottomTabs",
    routes: screens.map((screen, i) => ({
      id: screen.route,
      path: i === 0 ? "/" : `/${screen.route}`,
      title: screen.title,
      slot: i < 4 ? "primary" : "secondary",
      ...(i < 4 ? { nav: { label: screen.title, order: i + 1 } } : {}),
    })),
  };
}

const isStr = (v: unknown, max = 8000): v is string => typeof v === "string" && v.length <= max;
const isPath = (v: unknown, folder: string): v is string =>
  isStr(v, 200) && v.startsWith(`${folder}/`) && !v.includes("..") && !v.includes("\\");

/** Defensive parse of design/directions/directions.json. Returns null for anything malformed. */
export function parseDirectionSet(raw: unknown): DirectionSet | null {
  const s = raw as Partial<DirectionSet> | null;
  if (
    !s || s.version !== 1 || !isStr(s.brief) || !DIRECTION_STACKS.includes(s.stack as DirectionStack) || !isStr(s.created, 40) ||
    s.routes !== `${DIRECTIONS_FOLDER}/routes.json`
  ) return null;
  if (!Array.isArray(s.directions) || s.directions.length < 3 || s.directions.length > 5) return null;
  const directions: DirectionPlan[] = [];
  for (const d of s.directions) {
    if (
      !d || !isSafeDesignName(d.id) || !isStr(d.name, 60) || !/^#[0-9a-fA-F]{6}$/.test(String(d.seed)) ||
      d.designMd !== `${DIRECTIONS_FOLDER}/${d.id}/DESIGN.md` || !Array.isArray(d.screens)
    ) return null;
    const screens = d.screens.filter((x) =>
      x && isSafeDesignName(x.id) && isStr(x.title, 60) && isSafeDesignName(x.route) && isPath(x.file, `${DIRECTIONS_FOLDER}/${d.id}`) &&
      x.file === `${DIRECTIONS_FOLDER}/${d.id}/${x.id}.html`
    );
    if (screens.length < 3 || screens.length > 6) return null;
    directions.push({ id: d.id, name: d.name, seed: d.seed, designMd: d.designMd, screens });
  }
  return { version: 1, brief: s.brief, stack: s.stack as DirectionStack, created: s.created, routes: s.routes, directions };
}

export function parseDirectionSelection(raw: unknown): DirectionSelection | null {
  const s = raw as Partial<DirectionSelection> | null;
  if (
    !s || s.version !== 1 || !isSafeDesignName(s.directionId) || !isStr(s.name, 60) || !isStr(s.brief) ||
    !DIRECTION_STACKS.includes(s.stack as DirectionStack)
  ) return null;
  if (
    !isStr(s.notes, 4000) || !isStr(s.lockedAt, 40) || !isPath(s.designMd, DIRECTIONS_FOLDER) ||
    s.routeMap !== `${DIRECTIONS_FOLDER}/routes.json` || !Array.isArray(s.screens)
  ) return null;
  return { ...(s as DirectionSelection), screens: s.screens.filter((x) => isPath(x?.file, DIRECTIONS_FOLDER)) };
}
