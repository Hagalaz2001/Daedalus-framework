// `deno task sync`: turns the repository's own documents into Starlight pages so the site cannot drift from the docs.
// Output (git-ignored): src/content/docs/**, src/assets/docs/**, src/data/generated/site.json.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoteHeadings, describe, firstHeading, type LinkEnv, pickSection, processBody, stripFirstHeading } from "./docs-lib.ts";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const repo = resolve(site, "..");
const OUT = join(site, "src/content/docs");
const IMG = join(site, "src/assets/docs");
const BASE = "/Daedalus-framework/";
const GITHUB = "https://github.com/Hagalaz2001/Daedalus-framework";

const read = (p: string) => readFileSync(join(repo, p), "utf8").replace(/\r\n/g, "\n");
const has = (p: string) => existsSync(join(repo, p));
const json = <T>(p: string): T | null => (has(p) ? JSON.parse(read(p)) : null);
const stat = (p: string) => (has(p) ? (statSync(join(repo, p)).isDirectory() ? "dir" as const : "file" as const) : null);
const dirs = (p: string) => (has(p) ? readdirSync(join(repo, p), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : []);

interface Page {
  slug: string;
  title?: string;
  description?: string;
  /** Repo path whose links resolve relative to, and which "Edit page" points at. */
  source: string;
  /** Other repo paths that should also link to this page. */
  aliases?: string[];
  body: () => string;
}

const doc = (path: string) => () => stripFirstHeading(read(path));
/** Every docs entry point opens with a plain-language box before the technical text. */
const PLAIN_INTRO = `:::tip[In plain words]
Daedalus helps you build a website, a phone app and a desktop app together, so they look and work like one product.
AI does the building. You make the decisions. It is free and open source.
New here? Try the [live demo](${BASE}demo/) first, then come back for the details.
:::

`;
const pages: Page[] = [];
const add = (p: Page) => pages.push(p);

// ---- Getting started (README sections) ----
const readme = () => read("README.md");
add({
  slug: "getting-started/introduction",
  title: "Introduction",
  source: "README.md",
  aliases: ["README.md"],
  body: () => {
    const r = readme();
    const pre = stripFirstHeading(r.split(/^## /m)[0]).trim();
    return `${PLAIN_INTRO}${pre}\n\n${pickSection(r, "What you get")}`;
  },
});
add({ slug: "getting-started/why-daedalus", title: "Why use Daedalus?", source: "docs/WHY.md", aliases: ["docs/WHY.md"], body: doc("docs/WHY.md") });
add({
  slug: "getting-started/install",
  title: "Install and first project",
  description: "Install Daedalus, generate a project, and learn the daily loop and commands.",
  source: "README.md",
  body: () =>
    ["Quick start", "Daily loop", "Commands", "Troubleshooting"].map((s) => pickSection(readme(), s)).filter(Boolean).join("\n"),
});
add({
  slug: "getting-started/choosing-a-stack",
  title: "Choosing a stack",
  description: "Which web, mobile, desktop and backend stack to pick, and why.",
  source: "README.md",
  body: () => pickSection(readme(), "Choosing a stack").replace(/^## .*\n+/, ""),
});

// ---- Concepts ----
add({ slug: "concepts/architecture", source: "template/docs/ARCHITECTURE.md", aliases: ["template/docs/ARCHITECTURE.md"], body: doc("template/docs/ARCHITECTURE.md") });
add({
  slug: "concepts/contract-first",
  title: "Contract first",
  description: "One OpenAPI contract produces the backend validation and every client, so layers cannot disagree.",
  source: "template/docs/ARCHITECTURE.md",
  body: () => pickSection(read("template/docs/ARCHITECTURE.md"), "2.", "Contract, client, state, UI").replace(/^## .*\n+/, ""),
});
add({
  slug: "concepts/boundaries",
  title: "Feature boundaries",
  description: "Feature-first modules, public entries, and the lint that enforces them.",
  source: "template/docs/ARCHITECTURE.md",
  body: () => pickSection(read("template/docs/ARCHITECTURE.md"), "3.", "Feature-first modules").replace(/^## .*\n+/, ""),
});
add({
  slug: "concepts/design-tokens",
  title: "Design tokens and presets",
  description: "One tokens.json drives the theme of every stack; presets give projects different looks.",
  source: "stacks/web-shared/README.md",
  body: () => {
    const theming = pickSection(read("stacks/web-shared/README.md"), "Theming").replace(/^## .*\n+/, "");
    const rows = (has("template/design/presets") ? readdirSync(join(repo, "template/design/presets")) : [])
      .filter((f) => f.endsWith(".json")).sort().map((f) => {
        const p = JSON.parse(read(`template/design/presets/${f}`));
        return { id: p.meta?.id ?? f, name: p.meta?.name ?? f, description: p.meta?.description ?? "", p };
      });
    const sw = (hex: string) => `<span class="swatch" style="--c:${hex}" title="${hex}"></span>`;
    const table = rows.map((r) => {
      const c = r.p.color ?? {};
      const d = r.p.colorDark ?? {};
      return `| **${r.name}** (\`${r.id}\`) | ${r.description} | ${["primary", "surface", "text"].map((k) => sw(c[k])).join(" ")} | ${["primary", "surface", "text"].map((k) => sw(d[k])).join(" ")} | ${r.p.font?.display ?? ""} |`;
    });
    return `One file, \`design/tokens.json\`, is the source of truth. \`deno task sync\` turns it into each stack's theme.\n\n${theming}\n\n## Presets\n\n| Preset | Direction | Light | Dark | Display font |\n|---|---|---|---|---|\n${table.join("\n")}\n\nPass \`--ui <preset>\` to the generator, or copy a preset over \`design/tokens.json\` and run \`deno task sync\`.\n`;
  },
});
add({
  slug: "concepts/diagrams",
  title: "Diagrams",
  description: "How Daedalus fits together: architecture, request lifecycle, auth, database, deployment and the development loop.",
  source: "template/docs/diagrams/README.md",
  body: () => {
    const order = ["architecture", "generator-flow", "development-loop", "request-lifecycle", "auth-flows", "database", "deployment", "ai-workflow"];
    return order.filter((n) => has(`template/docs/diagrams/${n}.md`)).map((n) => demoteHeadings(read(`template/docs/diagrams/${n}.md`))).join("\n\n");
  },
});
add({
  slug: "concepts/deno-and-security",
  title: "Deno only, security gate",
  source: "README.md",
  body: () => ["Deno only", "Security gate"].map((s) => pickSection(readme(), s)).join("\n"),
});

// ---- Stacks ----
interface StackDef {
  id: string;
  title: string;
  readme?: string;
  blurb: string;
  screenshots?: string;
}
const STACKS: StackDef[] = [
  { id: "web-spa", title: "Web app (React)", readme: "stacks/web-spa/README.md", blurb: "React 19, Vite, TypeScript, Tailwind v4 and TanStack Query for a signed-in product UI.", screenshots: "web" },
  { id: "web-spa-vue", title: "Web app (Vue)", blurb: "Vue 3, Vite, Pinia and TanStack Query (Vue), with a shadcn-style Vue kit.", screenshots: "web" },
  { id: "web-site-astro", title: "Website (Astro)", blurb: "Static, SEO-first website with islands in React or Vue. The default site stack.", screenshots: "website" },
  { id: "web-site-next", title: "Website (Next.js)", readme: "stacks/web-site-next/README.md", blurb: "Next.js App Router site for pages that need server features.", screenshots: "website" },
  { id: "mobile-flutter", title: "Mobile (Flutter)", readme: "stacks/mobile-flutter/app/README.md", blurb: "Flutter and Riverpod for Android and iOS, with a generated Dart client.", screenshots: "mobile" },
  { id: "mobile-rn", title: "Mobile (React Native)", readme: "stacks/mobile-rn/README.md", blurb: "React Native with Expo, sharing the TypeScript client with web and backend.", screenshots: "mobile" },
  { id: "desktop-gpui", title: "Desktop (Rust + GPUI)", readme: "stacks/desktop-gpui/README.md", blurb: "Native desktop app in Rust on GPUI. No webview, no Node.", screenshots: "desktop" },
  { id: "desktop-tauri", title: "Desktop (Tauri)", readme: "stacks/desktop-tauri/README.md", blurb: "Rust shell with a webview that reuses the React UI kit.", screenshots: "desktop" },
  { id: "web-shared", title: "Web UI kit", readme: "stacks/web-shared/README.md", blurb: "The shadcn-style component kit shared by the React web stacks." },
];
interface StackJson {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  defaultAppDir?: string;
  tasks?: Record<string, string | { run: string }>;
}
STACKS.forEach((s) => {
  const sj = json<StackJson>(`stacks/${s.id}/stack.json`);
  add({
    slug: `stacks/${s.id}`,
    title: s.title,
    description: sj?.description ?? s.blurb,
    source: s.readme ?? `stacks/${s.id}`,
    aliases: [`stacks/${s.id}`, `stacks/${s.id}/README.md`, ...(s.readme ? [s.readme] : [])],
    body: () => {
      const facts: string[] = [];
      if (sj) {
        facts.push(`| | |\n|---|---|\n| Stack id | \`${sj.id}\` |\n| Kind | ${sj.kind} |`);
        if (sj.label) facts[0] += `\n| Targets | ${sj.label} |`;
        if (sj.defaultAppDir) facts[0] += `\n| Default folder | \`${sj.defaultAppDir}\` |`;
        const tasks = Object.keys(sj.tasks ?? {});
        if (tasks.length) facts[0] += `\n| Root tasks | ${tasks.map((t) => `\`deno task ${t}\``).join(", ")} |`;
      }
      const body = s.readme && has(s.readme) ? stripFirstHeading(read(s.readme)) : `${sj?.description ?? s.blurb}\n`;
      const gen = `Add it to a project with \`daedalus new ... --${sj?.kind === "mobile" ? "mobile" : sj?.kind === "desktop" ? "desktop" : "web"} ${flag(s.id)}\` or later with \`deno task add-app ${s.id} <name>\`.`;
      const shots = s.screenshots ? `\nSee it in the [showcase](${BASE}showcase/#${s.screenshots}).\n` : "";
      return `${s.blurb}\n\n${facts.join("\n")}\n\n${s.id === "web-shared" ? "" : gen + "\n"}${shots}\n${body}`;
    },
  });
});
function flag(id: string): string {
  return ({ "web-spa": "spa", "web-spa-vue": "spa-vue", "web-site-astro": "site", "web-site-next": "site-next", "mobile-flutter": "flutter", "mobile-rn": "rn", "desktop-gpui": "gpui", "desktop-tauri": "tauri" } as Record<string, string>)[id] ?? id;
}
add({ slug: "stacks/backend", title: "Backend (Hono)", source: "template/backend/README.md", aliases: ["template/backend/README.md", "template/backend"], body: doc("template/backend/README.md") });
add({ slug: "stacks/database", source: "template/docs/DATABASE.md", aliases: ["template/docs/DATABASE.md"], body: doc("template/docs/DATABASE.md") });
add({ slug: "stacks/operations", source: "template/docs/OPERATIONS.md", aliases: ["template/docs/OPERATIONS.md"], body: doc("template/docs/OPERATIONS.md") });

// ---- Modules ----
interface ModuleJson { name: string; title?: string; status?: string; summary?: string; description?: string }
function catalog(kind: "modules" | "packs"): string {
  const file = kind === "modules" ? "module.json" : "pack.json";
  const rows = dirs(kind).map((d) => json<ModuleJson>(`${kind}/${d}/${file}`)).filter((m): m is ModuleJson => !!m).map((m) => {
    const text = (m.summary ?? m.description ?? "").replace(/\|/g, "/");
    const link = kind === "packs" && has(`packs/${m.name}/README.md`) ? `[${m.title ?? m.name}](${BASE}packs/${m.name}/)` : m.title ?? m.name;
    return `| ${link} | \`${m.name}\` | ${m.status ?? ""} | ${text} |`;
  });
  return `| Name | Id | Status | What it adds |\n|---|---|---|---|\n${rows.join("\n")}\n`;
}
add({
  slug: "modules/overview",
  title: "Modules",
  source: "template/docs/MODULES.md",
  aliases: ["template/docs/MODULES.md", "modules/README.md", "modules"],
  body: () => `${stripFirstHeading(read("template/docs/MODULES.md"))}\n## Catalog\n\n${catalog("modules")}`,
});
add({
  slug: "packs/overview",
  title: "Domain packs",
  source: "packs/README.md",
  aliases: ["packs/README.md", "packs"],
  body: () => `${stripFirstHeading(read("packs/README.md"))}\n## Catalog\n\n${catalog("packs")}`,
});
for (const d of dirs("packs")) {
  if (!has(`packs/${d}/README.md`)) continue;
  add({ slug: `packs/${d}`, title: `${d} pack`, source: `packs/${d}/README.md`, aliases: [`packs/${d}/README.md`, `packs/${d}`], body: doc(`packs/${d}/README.md`) });
}

// ---- Studio, AI, reference, contributing ----
add({ slug: "studio/overview", title: "Daedalus Studio", source: "docs/STUDIO.md", aliases: ["docs/STUDIO.md", "studio"], body: doc("docs/STUDIO.md") });
add({ slug: "ai/workflow", source: "template/docs/AI-WORKFLOW.md", aliases: ["template/docs/AI-WORKFLOW.md"], body: doc("template/docs/AI-WORKFLOW.md") });
add({ slug: "ai/responsible-ai", source: "template/docs/RESPONSIBLE-AI.md", aliases: ["template/docs/RESPONSIBLE-AI.md"], body: doc("template/docs/RESPONSIBLE-AI.md") });
add({ slug: "ai/disclaimer", source: "DISCLAIMER.md", aliases: ["DISCLAIMER.md"], body: doc("DISCLAIMER.md") });
add({ slug: "reference/cli", title: "CLI reference", source: "docs/CLI.md", aliases: ["docs/CLI.md"], body: doc("docs/CLI.md") });
add({ slug: "reference/mcp-and-integrations", title: "MCP and AI integrations", source: "docs/INTEGRATIONS.md", aliases: ["docs/INTEGRATIONS.md"], body: doc("docs/INTEGRATIONS.md") });
add({
  slug: "reference/stack-manifest",
  title: "Stack manifest",
  source: "README.md",
  body: () => ["Stack manifest", "Modules and packs"].map((s) => pickSection(readme(), s)).join("\n"),
});
add({ slug: "contributing/guide", title: "Contributing", source: "CONTRIBUTING.md", aliases: ["CONTRIBUTING.md"], body: doc("CONTRIBUTING.md") });
add({ slug: "contributing/security", title: "Security policy", source: "SECURITY.md", aliases: ["SECURITY.md"], body: doc("SECURITY.md") });
add({ slug: "contributing/code-of-conduct", title: "Code of conduct", source: "CODE_OF_CONDUCT.md", aliases: ["CODE_OF_CONDUCT.md"], body: doc("CODE_OF_CONDUCT.md") });
add({ slug: "contributing/changelog", title: "Changelog", source: "CHANGELOG.md", aliases: ["CHANGELOG.md"], body: doc("CHANGELOG.md") });
add({ slug: "contributing/third-party", title: "Third-party notices", source: "THIRD_PARTY_NOTICES.md", aliases: ["THIRD_PARTY_NOTICES.md"], body: doc("THIRD_PARTY_NOTICES.md") });
add({ slug: "contributing/catalog", title: "Open-source catalog", source: "CATALOG.md", aliases: ["CATALOG.md"], body: doc("CATALOG.md") });

// ---- Learn, Method, Developer guide (docs/learn, docs/METHOD.md, docs/diagrams, docs/dev) ----
add({ slug: "learn/start-here", title: "Start here", source: "docs/learn/README.md", aliases: ["docs/learn"], body: () => PLAIN_INTRO + stripFirstHeading(read("docs/learn/README.md")) });
for (const f of ["what-is-daedalus", "install", "first-app", "working-with-ai", "glossary", "faq", "troubleshooting"]) {
  add({ slug: `learn/${f}`, source: `docs/learn/${f}.md`, body: doc(`docs/learn/${f}.md`) });
}
add({ slug: "method/the-method", title: "The Daedalus Method", source: "docs/METHOD.md", aliases: ["template/docs/METHOD.md"], body: doc("docs/METHOD.md") });
add({
  slug: "method/diagrams",
  title: "Method diagrams",
  description: "Mermaid diagrams: the cycle, roles, a flight, Definition of Done, idea to app, how the pieces fit, which stack.",
  source: "docs/diagrams/README.md",
  aliases: ["docs/diagrams", ...(has("docs/diagrams") ? readdirSync(join(repo, "docs/diagrams")).filter((n) => n.endsWith(".md")).map((n) => `docs/diagrams/${n}`) : [])],
  body: () =>
    ["method-cycle", "roles", "flight-timeline", "definition-of-done", "idea-to-app", "how-it-fits", "choose-stack"]
      .filter((n) => has(`docs/diagrams/${n}.md`)).map((n) => demoteHeadings(read(`docs/diagrams/${n}.md`))).join("\n\n"),
});
add({ slug: "dev/start", title: "Developer guide", source: "docs/dev/README.md", aliases: ["docs/dev"], body: doc("docs/dev/README.md") });
for (const f of ["cheatsheet", "recipes", "anatomy"]) add({ slug: `dev/${f}`, source: `docs/dev/${f}.md`, body: doc(`docs/dev/${f}.md`) });

// ---- Write ----
const live = pages.filter((p) => has(p.source) || p.source.startsWith("stacks/"));
const pageUrl = new Map<string, string>();
for (const p of live) {
  for (const a of [p.source, ...(p.aliases ?? [])]) if (!pageUrl.has(a)) pageUrl.set(a, `${BASE}${p.slug}/`);
}

rmSync(OUT, { recursive: true, force: true });
rmSync(IMG, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(IMG, { recursive: true });

const yaml = (s: string) => JSON.stringify(s);
const broken: string[] = [];
let order = 0;
for (const p of live) {
  const file = join(OUT, `${p.slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  const raw = p.body();
  const env: LinkEnv = {
    from: p.source,
    pages: pageUrl,
    stat,
    github: GITHUB,
    onBroken: (t, f) => broken.push(`${f}: ${t}`),
    image: (repoPath) => {
      const name = repoPath.replace(/[\\/]/g, "-");
      copyFileSync(join(repo, repoPath), join(IMG, name));
      return posix.relative(dirname(posix.join("src/content/docs", `${p.slug}.md`)), posix.join("src/assets/docs", name));
    },
  };
  // The README quotes a placeholder org in its clone URL; the site points at the real repository.
  const body = processBody(raw, env).replaceAll("https://github.com/daedalus-framework/daedalus-framework", GITHUB);
  const title = p.title ?? (has(p.source) && p.source.endsWith(".md") ? firstHeading(read(p.source)) : undefined) ?? p.slug;
  const desc = p.description ?? describe(body);
  const edit = stat(p.source) === "dir" ? `${GITHUB}/tree/main/${p.source}` : `${GITHUB}/edit/main/${p.source}`;
  const front = [
    "---",
    `title: ${yaml(title.replace(/\s*\(status:.*$/, ""))}`,
    desc ? `description: ${yaml(desc)}` : "",
    `editUrl: ${yaml(edit)}`,
    `sidebar:\n  order: ${order++}`,
    "---",
  ].filter(Boolean).join("\n");
  writeFileSync(file, `${front}\n\n${body.trim()}\n`);
}

// Facts for the landing page and the showcase.
const count = (p: string, f: string) => dirs(p).filter((d) => has(`${p}/${d}/${f}`)).length;
const presets = (has("template/design/presets") ? readdirSync(join(repo, "template/design/presets")) : []).filter((f) => f.endsWith(".json")).sort()
  .map((f) => JSON.parse(read(`template/design/presets/${f}`)));
mkdirSync(join(site, "src/data/generated"), { recursive: true });
writeFileSync(
  join(site, "src/data/generated/site.json"),
  JSON.stringify({
    modules: count("modules", "module.json"),
    packs: count("packs", "pack.json"),
    stacks: STACKS.filter((s) => s.id !== "web-shared").length,
    presets: presets.map((p) => ({ id: p.meta?.id, name: p.meta?.name, description: p.meta?.description, color: p.color, colorDark: p.colorDark, font: p.font, radius: p.radius })),
  }, null, 2),
);

console.log(`sync-docs: ${live.length} pages` + (broken.length ? `; ${broken.length} unresolved links:\n  ${broken.join("\n  ")}` : ""));
