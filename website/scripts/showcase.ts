// `deno task showcase`: collects the screenshots the stacks and the studio produced and writes the gallery manifest.
// Output (git-ignored): src/assets/showcase/<stack>/<name>-<theme>.png and src/data/generated/showcase.json.
// A stack with no screenshots yet becomes a "coming soon" card. Nothing is ever faked: run this again after a stack
// writes images to stacks/<id>/docs/screenshots/ (files named <screen>[-<width>]-light.png and ...-dark.png).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(site, "..");
const ASSETS = join(site, "src/assets/showcase");

type Shape = "wide" | "phone";
interface Source {
  platform: string;
  stack: string;
  label: string;
  /** Repo-relative folder holding the PNGs. */
  dir: string;
  shape: Shape;
  /** Only these screens (in this order); omit to take everything found. */
  only?: string[];
  /** Pending-card text while the folder is empty. */
  pending?: string;
}

export const PLATFORMS = [
  { id: "website", title: "Website", blurb: "Marketing sites, blogs and pricing pages: static or server-rendered, fast, and accessible." },
  { id: "web", title: "Web app", blurb: "Signed-in product UI: dashboards, lists, forms and settings, with every empty, error and loading state designed." },
  { id: "mobile", title: "Mobile", blurb: "Android and iOS apps from the same contract and tokens, in React Native or Flutter." },
  { id: "desktop", title: "Desktop", blurb: "Native Rust desktop apps, on GPUI or in a Tauri shell." },
  { id: "studio", title: "Studio", blurb: "The design studio: directions, system, flow and checks drafted next to your code." },
];

const SOURCES: Source[] = [
  { platform: "website", stack: "web-site-astro", label: "Astro site", dir: "stacks/web-site-astro/docs/screenshots", shape: "wide", pending: "The Astro site stack has no screenshots yet." },
  { platform: "website", stack: "web-site-next", label: "Next.js site", dir: "stacks/web-site-next/docs/screenshots", shape: "wide" },
  { platform: "web", stack: "web-spa", label: "React app", dir: "stacks/web-spa/docs/screenshots", shape: "wide" },
  { platform: "web", stack: "web-spa-vue", label: "Vue app", dir: "stacks/web-spa-vue/docs/screenshots", shape: "wide", only: ["dashboard", "notes", "note-detail", "settings"] },
  { platform: "mobile", stack: "mobile-rn", label: "React Native", dir: "stacks/mobile-rn/docs/screenshots", shape: "phone" },
  { platform: "mobile", stack: "mobile-flutter", label: "Flutter", dir: "stacks/mobile-flutter/docs/screenshots", shape: "phone", pending: "Flutter screenshots land once the app has been run on an emulator." },
  { platform: "desktop", stack: "desktop-gpui", label: "Rust + GPUI", dir: "stacks/desktop-gpui/docs/screenshots", shape: "wide", pending: "The native app has not been launched for capture yet." },
  { platform: "desktop", stack: "desktop-tauri", label: "Tauri", dir: "stacks/desktop-tauri/docs/screenshots", shape: "wide", pending: "The Tauri app has not been launched for capture yet." },
  { platform: "studio", stack: "studio", label: "Studio", dir: "docs/studio", shape: "wide" },
];

const CAPTIONS: Record<string, string> = {
  landing: "Landing page", pricing: "Pricing", about: "About", blog: "Blog index", post: "Article", contact: "Contact form",
  "contact-errors": "Contact form, validation errors", menu: "Mobile menu", privacy: "Legal page", "404": "Not found",
  "presets/landing-editorial": "Landing with the editorial preset", "presets/pricing-editorial": "Pricing with the editorial preset",
  dashboard: "Dashboard", "dashboard-empty": "Dashboard, empty state", "delete-dialog": "Confirm before deleting",
  "forgot-password": "Forgot password", "note-detail": "Detail view", "note-form-error": "Form with validation errors",
  notes: "List with search and filters", "notes-empty": "List, empty state", "notes-no-match": "List, no matches",
  "not-found": "Not found", "onboarding-1": "Onboarding, step 1", "onboarding-2": "Onboarding, step 2", profile: "Profile",
  "profile-delete": "Account deletion", settings: "Settings", "sign-in": "Sign in", "sign-up": "Sign up",
  onboarding: "Onboarding", "sign-in-errors": "Sign in, validation errors", home: "Home", detail: "Detail view",
  studio: "Studio workspace", checks: "Design checks", directions: "Design directions", "export-diff": "Export diff",
  flow: "User flow", system: "Design system",
};

/** Strongest screens first; error, legal and not-found pages last. Unlisted screens keep file order between the two. */
const FIRST = ["landing", "dashboard", "home", "studio", "pricing", "notes", "sign-in"];
const LAST = /404|not-found|privacy|legal|terms|error/;
const rank = (name: string) => {
  const base = name.replace(/^\d+-/, "");
  if (LAST.test(base)) return 1000;
  const i = FIRST.indexOf(base);
  return i < 0 ? 100 : i;
};
const title = (s: string) => s.replace(/[-/]/g, " ").replace(/^./, (c) => c.toUpperCase());
const FILE = /^(.*?)(?:[-_](\d+))?[-_](light|dark)\.png$/;

/** Width and height from a PNG header. */
function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

interface Item {
  stack: string;
  stackLabel: string;
  name: string;
  caption: string;
  shape: Shape;
  light?: string;
  dark?: string;
  /** Path under src/assets/showcase. */
  single?: string;
  width: number;
  height: number;
}

function files(dir: string): string[] {
  const abs = join(repo, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".png")) out.push(e.name);
    else if (e.isDirectory() && e.name === "presets") {
      for (const f of readdirSync(join(abs, e.name))) if (f.endsWith(".png")) out.push(`${e.name}/${f}`);
    }
  }
  return out.sort();
}

rmSync(ASSETS, { recursive: true, force: true });
const items: Item[] = [];
const pending: { platform: string; stack: string; label: string; note: string }[] = [];

for (const src of SOURCES) {
  const found = files(src.dir);
  // name -> width -> theme -> file
  const groups = new Map<string, Map<number, Map<string, string>>>();
  const singles: string[] = [];
  for (const f of found) {
    const m = FILE.exec(f);
    if (!m) {
      singles.push(f);
      continue;
    }
    const [, rawName, w, theme] = m;
    const name = rawName.replace(/_/g, "-");
    const byW = groups.get(name) ?? new Map();
    const byT = byW.get(Number(w ?? 0)) ?? new Map();
    byT.set(theme, f);
    byW.set(Number(w ?? 0), byT);
    groups.set(name, byW);
  }
  const before = items.length;
  const out = join(ASSETS, src.stack);
  mkdirSync(out, { recursive: true });
  const put = (rel: string, dest: string) => {
    mkdirSync(dirname(join(out, dest)), { recursive: true });
    copyFileSync(join(repo, src.dir, rel), join(out, dest));
    return `${src.stack}/${dest}`;
  };
  const wanted = (name: string) => !src.only || src.only.includes(name);
  for (const [name, byW] of groups) {
    if (!wanted(name)) continue;
    // One width per screen: desktop-sized for wide shapes, otherwise the only one there is.
    const widths = [...byW.keys()].sort((a, b) => a - b);
    const w = src.shape === "wide" ? (widths.includes(1440) ? 1440 : widths[widths.length - 1]) : widths[0];
    const themes = byW.get(w)!;
    const base = name.replace(/^\d+-/, "");
    const light = themes.get("light");
    const dark = themes.get("dark");
    if (!light || !dark) continue;
    const size = pngSize(join(repo, src.dir, light));
    items.push({
      stack: src.stack,
      stackLabel: src.label,
      name,
      caption: CAPTIONS[base] ?? CAPTIONS[name] ?? title(base),
      shape: src.shape,
      light: put(light, `${name}-light.png`),
      dark: put(dark, `${name}-dark.png`),
      ...size,
    });
  }
  for (const f of singles) {
    const name = f.replace(/\.png$/, "");
    if (!wanted(name)) continue;
    items.push({ stack: src.stack, stackLabel: src.label, name, caption: CAPTIONS[name] ?? title(name), shape: src.shape, single: put(f, f), ...pngSize(join(repo, src.dir, f)) });
  }
  const mine = items.splice(before);
  mine.sort((x, y) => rank(x.name) - rank(y.name));
  items.push(...mine);
  if (src.stack === "studio") items.sort((x, y) => Number(y.name === "studio") - Number(x.name === "studio"));
  if (items.length === before) pending.push({ platform: src.platform, stack: src.stack, label: src.label, note: src.pending ?? "No screenshots yet." });
}

mkdirSync(join(site, "src/data/generated"), { recursive: true });
writeFileSync(
  join(site, "src/data/generated/showcase.json"),
  JSON.stringify({ platforms: PLATFORMS.map((p) => ({ ...p, items: items.filter((i) => SOURCES.find((s) => s.stack === i.stack)!.platform === p.id), pending: pending.filter((x) => x.platform === p.id) })) }, null, 2),
);
console.log(`showcase: ${items.length} screens collected; coming soon: ${pending.map((p) => p.stack).join(", ") || "none"}`);
