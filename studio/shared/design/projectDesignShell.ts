// App shell + route map. design/shell/<id>.html holds the navigation chrome with an outlet
// (<main data-outlet>) and a nav placeholder (<nav data-nav>); design/shell/<id>.routes.json is the
// route table. A screen file stores only its body plus a first-line marker
//   <!-- shell: app route: appointments -->
// and the preview merges shell + body, so renaming a tab edits the route map once and every screen
// reflects it. The merge itself runs in main (projectDesignShells.ts) on a parsed tree.
import { isSafeDesignName } from "./projectDesignLogic.ts";

export const NAV_ARCHETYPES = ["bottomTabs", "sidebar", "topNav"] as const;
export const ROUTE_SLOTS = ["primary", "secondary", "detail", "modal"] as const;
export const BADGE_KINDS: readonly string[] = ["count", "dot"];
export type NavArchetype = (typeof NAV_ARCHETYPES)[number];
export type RouteSlot = (typeof ROUTE_SLOTS)[number];

export interface DesignRoute {
  id: string;
  path: string;
  title: string;
  slot: RouteSlot;
  nav?: { label: string; icon?: string; order: number; badge?: { kind: "count" | "dot"; value?: number } };
  header?: {
    show: boolean;
    back?: boolean;
    titleStyle?: "centered" | "largeLeft" | "hidden";
    actions?: { id: string; icon: string; ariaLabel: string }[];
  };
  layout?: { contentPadding?: string; hideNav?: boolean; surface?: string };
}

export interface DesignRouteMap {
  appId: string;
  defaultRoute: string;
  navArchetype: NavArchetype;
  routes: DesignRoute[];
}

const str = (v: unknown, max = 120): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

/** Throws with the reason for the first problem, so a bad route map is rejected whole. */
export function parseRouteMap(raw: unknown): DesignRouteMap {
  const m = raw as Partial<DesignRouteMap> | null;
  if (!m || !isSafeDesignName(m.appId)) throw new Error("appId must be a short lowercase name.");
  if (!NAV_ARCHETYPES.includes(m.navArchetype as NavArchetype)) throw new Error("navArchetype must be bottomTabs, sidebar or topNav.");
  if (!Array.isArray(m.routes) || m.routes.length === 0 || m.routes.length > 40) throw new Error("A route map needs 1-40 routes.");
  const seen = new Set<string>();
  const routes = m.routes.map((r, i): DesignRoute => {
    const at = `Route ${i + 1}`;
    if (!isSafeDesignName(r?.id) || seen.has(r.id)) throw new Error(`${at}: id must be unique and lowercase.`);
    seen.add(r.id);
    if (!str(r.path, 200) || !r.path.startsWith("/")) throw new Error(`${at}: path must start with /.`);
    if (!str(r.title)) throw new Error(`${at}: title missing.`);
    if (!ROUTE_SLOTS.includes(r.slot)) throw new Error(`${at}: slot must be primary, secondary, detail or modal.`);
    if (r.nav && (!str(r.nav.label, 40) || typeof r.nav.order !== "number")) throw new Error(`${at}: nav needs a label and an order.`);
    if (
      r.nav?.badge && (!BADGE_KINDS.includes(r.nav.badge.kind) || (r.nav.badge.value !== undefined && !Number.isFinite(r.nav.badge.value)))
    ) throw new Error(`${at}: badge kind must be count or dot.`);
    if (r.slot === "primary" && !r.nav) throw new Error(`${at}: a primary route needs a nav entry.`);
    return r;
  });
  if (!seen.has(m.defaultRoute as string)) throw new Error("defaultRoute is not one of the routes.");
  return { appId: m.appId, defaultRoute: m.defaultRoute as string, navArchetype: m.navArchetype as NavArchetype, routes };
}

const MARKER = /^\s*<!--\s*shell:\s*([a-z0-9][a-z0-9-]*)\s+route:\s*([a-z0-9][a-z0-9-]*)\s*-->/;

/** The shell and route a screen body declares, or null for a self-contained page. */
export const readShellMarker = (html: string): { shellId: string; route: string } | null => {
  const m = MARKER.exec(html);
  return m && isSafeDesignName(m[1]) && isSafeDesignName(m[2]) ? { shellId: m[1]!, route: m[2]! } : null;
};

/** The body without its first-line shell marker. */
export const stripShellMarker = (html: string): string => html.replace(MARKER, "");
