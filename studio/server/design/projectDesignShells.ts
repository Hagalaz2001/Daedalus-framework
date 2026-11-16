// design/shell/<id>.html + <id>.routes.json: read, validate and merge into screen bodies.
import { join, resolve, sep } from "node:path";
import * as cheerio from "cheerio";
import { contentSha } from "./projectDesignTrust.ts";
import { readProjectDir, readProjectText } from "./projectDesignFs.ts";
import {
  DESIGN_FOLDER,
  type DesignRouteMap,
  isSafeDesignName,
  parseRouteMap,
  readShellMarker,
  stripShellMarker,
} from "../../shared/design/index.ts";

const MAX_SHELL_BYTES = 512 * 1024;

export interface LoadedShell {
  id: string;
  html: string;
  map: DesignRouteMap;
  /** Hash of the shell page and its route file: a composed screen's verdict is valid while this and the body are unchanged. */
  key: string;
}

function shellPath(dir: string, id: string, extension: "html" | "routes.json"): string {
  const root = resolve(dir, DESIGN_FOLDER, "shell");
  const full = resolve(root, `${id}.${extension}`);
  if (!isSafeDesignName(id) || !full.startsWith(root + sep)) throw new Error("Not a shell name.");
  return full;
}

export async function loadShell(dir: string, id: string): Promise<LoadedShell> {
  const [html, routes] = await Promise.all([
    readProjectText(dir, shellPath(dir, id, "html"), MAX_SHELL_BYTES),
    readProjectText(dir, shellPath(dir, id, "routes.json"), MAX_SHELL_BYTES),
  ]);
  if (html.length > MAX_SHELL_BYTES || routes.length > MAX_SHELL_BYTES) throw new Error("The shell is too large.");
  return { id, html, map: parseRouteMap(JSON.parse(routes)), key: contentSha(`${html}\0${routes}`) };
}

/** Shells that load cleanly; a broken one is skipped here and reported when a screen needs it. */
export async function listShells(dir: string): Promise<{ id: string; map: DesignRouteMap }[]> {
  const names = (await readProjectDir(dir, join(dir, DESIGN_FOLDER, "shell"))).map((e) => e.name);
  const ids = names.filter((n) => n.endsWith(".routes.json")).map((n) => n.slice(0, -".routes.json".length)).filter(isSafeDesignName).slice(
    0,
    10,
  );
  const loaded = await Promise.all(ids.map((id) => loadShell(dir, id).then((s) => ({ id, map: s.map }), () => null)));
  return loaded.filter((s): s is { id: string; map: DesignRouteMap } => s !== null);
}

/** The shell a screen body declares (null for a self-contained page) and a hash of everything its composed page depends on. */
export async function loadScreenShell(
  dir: string,
  html: string,
): Promise<{ shell: LoadedShell; marker: { shellId: string; route: string }; key: string } | null> {
  const marker = readShellMarker(html);
  if (!marker) return null;
  const shell = await loadShell(dir, marker.shellId).catch((error: unknown) => {
    throw new Error(`Shell "${marker.shellId}" cannot be used: ${error instanceof Error ? error.message : "unreadable"}`);
  });
  return { shell, marker, key: contentSha(`${shell.key}\0${html}`) };
}

/** A screen body becomes a whole page; a self-contained page is returned as it is. */
export async function resolveComposed(dir: string, html: string): Promise<{ html: string; shellId?: string; route?: string }> {
  const loaded = await loadScreenShell(dir, html);
  if (!loaded) return { html };
  return {
    html: composeScreen(loaded.shell.html, html, loaded.shell.map, loaded.marker.route),
    shellId: loaded.marker.shellId,
    route: loaded.marker.route,
  };
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Merges a screen body into its shell for one route: outlet, nav (primary routes by order), title, back, route attributes. */
export function composeScreen(shellHtml: string, body: string, map: DesignRouteMap, activeRoute: string): string {
  const active = map.routes.find((r) => r.id === activeRoute);
  if (!active) throw new Error(`The shell has no route "${activeRoute}".`);
  const nav = map.routes
    .filter((r) => r.slot === "primary" && r.nav)
    .sort((a, b) => a.nav!.order - b.nav!.order)
    .map((r) => {
      // Only the two known kinds reach the markup, whatever a hand-built map says (parseRouteMap rejects others too).
      const kind = r.nav!.badge?.kind === "count" ? "count" : r.nav!.badge?.kind === "dot" ? "dot" : null;
      const badge = kind
        ? `<span class="nav-badge" data-kind="${kind}">${kind === "count" ? Number(r.nav!.badge!.value ?? 0) || 0 : ""}</span>`
        : "";
      return `<a href="#${r.id}" data-route="${r.id}" class="nav-item"${r.id === active.id ? ' aria-current="page"' : ""}>${
        escapeHtml(r.nav!.label)
      }${badge}</a>`;
    })
    .join("");
  const $ = cheerio.load(shellHtml);
  $("[data-outlet]").first().html(stripShellMarker(body));
  $("[data-nav]").first().html(nav);
  $("[data-title]").first().text(active.title);
  if (!active.header?.back) $("[data-back]").attr("hidden", "");
  $("body").attr("data-route", active.id).attr("data-slot", active.slot);
  if (active.layout?.hideNav) $("body").attr("data-hide-nav", "");
  return $.html();
}
