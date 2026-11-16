// Records the data behind the "Watch Daedalus build an app" demo. Nothing here is invented:
//   - the design run comes from Daedalus Studio's own server code driven by its deterministic fixture provider
//     (the same one its tests use), with the real event stream timed as it arrives;
//   - the project creation and check come from the real `daedalus new` and `deno task check`, output timed per line.
// Output: src/demo/recording.json. Run it from the repository root with:
//   deno task --cwd website record
// It takes a few minutes (it installs a throwaway project). --skip-project reuses the last project recording;
// --only-project re-records only the project creation and check.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "../../studio/server/api.ts";
import { loadEnv } from "../../studio/server/env.ts";
import { ensureDemoProject } from "../../studio/server/demo.ts";
import { createFakeProvider } from "../../studio/server/providers/fake.ts";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(site, "..");
const OUT = join(site, "src/demo/recording.json");
const skipProject = Deno.args.includes("--skip-project");
const onlyProject = Deno.args.includes("--only-project");
const PORT = 4411;
const HOST = `127.0.0.1:${PORT}`;

const BRIEFS = [
  {
    id: "shop",
    label: "Shop dashboard",
    preset: "clean",
    brief: "A back-office dashboard for a small online shop: today's sales, recent orders and what needs attention.",
    screens: ["Overview", "Orders", "Order detail"],
  },
  {
    id: "members",
    label: "Sign-in for a members app",
    preset: "clean",
    brief: "A sign-in screen for a members app: friendly, fast on a phone, clear errors, and a way to reset the password.",
    screens: ["Sign in", "Create account", "Reset password"],
  },
  {
    id: "bakery",
    label: "Bakery orders, editorial look",
    preset: "editorial",
    brief: "A weekly orders overview for a neighbourhood bakery. Warm and editorial, easy to read at 5 a.m. on a tablet.",
    screens: ["This week", "Orders", "Order detail"],
  },
];

// ---- helpers ----
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const home = (Deno.env.get("USERPROFILE") ?? Deno.env.get("HOME") ?? "").replace(/\\/g, "/");
function clean(text: string, tokens: [string, string][]): string {
  let t = text.replace(ANSI, "").replace(/\r/g, "");
  t = t.replace(/\\/g, "/");
  for (const [from, to] of tokens) t = t.split(from.replace(/\\/g, "/")).join(to);
  if (home) t = t.split(home).join("~");
  // Recorded tool output can quote maintainers' emails (npm deprecation notices); never keep them.
  return t.replace(/[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g, "<email>");
}

async function streamLines(cmd: string[], cwd: string, tokens: [string, string][], stdin = false) {
  const t0 = performance.now();
  const lines: { t: number; text: string }[] = [];
  const p = new Deno.Command(cmd[0], { args: cmd.slice(1), cwd, stdout: "piped", stderr: "piped", stdin: stdin ? "null" : "null" }).spawn();
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    let buf = "";
    const dec = new TextDecoder();
    for await (const chunk of stream) {
      buf += dec.decode(chunk, { stream: true });
      const parts = buf.split(/\n/);
      buf = parts.pop() ?? "";
      for (const l of parts) {
        const text = clean(l, tokens).trimEnd();
        if (text.trim()) lines.push({ t: Math.round(performance.now() - t0), text });
      }
    }
    if (buf.trim()) lines.push({ t: Math.round(performance.now() - t0), text: clean(buf, tokens).trimEnd() });
  };
  await Promise.all([pump(p.stdout), pump(p.stderr)]);
  const status = await p.status;
  lines.sort((a, b) => a.t - b.t);
  return { lines, ok: status.success, code: status.code, durationMs: Math.round(performance.now() - t0) };
}

// ---- project creation and check (real) ----
async function recordProject() {
  const work = mkdtempSync(join(tmpdir(), "daedalus-rec-"));
  const dir = join(work, "shop");
  const tokens: [string, string][] = [[dir, "<project>"], [work, "<tmp>"], [repo, "<daedalus>"]];
  const args = ["new", dir, "--name", "Acme Shop", "--id", "com.example.shop", "--web", "spa", "--mobile", "rn", "--backend", "hono", "--ui", "clean", "--yes", "--no-check"];
  const created = await streamLines([Deno.execPath(), "run", "-A", join(repo, "cli.ts"), ...args], repo, tokens);
  const check = await streamLines([Deno.execPath(), "task", "check"], dir, tokens);
  rmSync(work, { recursive: true, force: true });
  return {
    command: "daedalus new ../shop --name \"Acme Shop\" --id com.example.shop --web spa --mobile rn --backend hono --ui clean --yes",
    create: created,
    checkCommand: "deno task check",
    check,
  };
}

// ---- studio run (fixture provider, real server code) ----
async function recordBrief(b: (typeof BRIEFS)[number]) {
  const work = mkdtempSync(join(tmpdir(), "daedalus-studio-"));
  // The demo project builder copies presets from <studioDir>/../template/design/presets.
  mkdirSync(join(work, "template", "design", "presets"), { recursive: true });
  for (const f of readdirSync(join(repo, "template/design/presets"))) {
    copyFileSync(join(repo, "template/design/presets", f), join(work, "template/design/presets", f));
  }
  const root = ensureDemoProject(join(work, "studio"));
  copyFileSync(join(root, "design/presets", `${b.preset}.json`), join(root, "design/tokens.json"));
  const manifest = JSON.parse(readFileSync(join(root, ".blueprint.json"), "utf8"));
  manifest.apps = [
    { stack: "web-spa", kind: "web", dir: "apps/web", name: "web" },
    { stack: "mobile-rn", kind: "mobile", dir: "apps/mobile", name: "mobile" },
  ];
  writeFileSync(join(root, ".blueprint.json"), JSON.stringify(manifest, null, 2));

  const api = createApi({ root, env: loadEnv([], {}), provider: createFakeProvider(70), uiDir: null });
  const call = async (path: string, body?: unknown) => {
    const res = await api.handle(
      new Request(`http://${HOST}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { host: HOST, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      PORT,
    );
    return res.json();
  };
  const design = (command: unknown) => call("/api/design", { command });

  // Timed event stream, as the studio UI sees it.
  const t0 = performance.now();
  const writes = new Map<string, { t: number; html: string; done: boolean }[]>();
  const sse = await api.handle(new Request(`http://${HOST}/api/events`, { headers: { host: HOST } }), PORT);
  const reader = sse.body!.getReader();
  const dec = new TextDecoder();
  const pump = (async () => {
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          const data = f.split("\n").find((l) => l.startsWith("data:"));
          if (!data) continue;
          const ev = JSON.parse(data.slice(5));
          if (ev.type === "write") {
            const arr = writes.get(ev.key) ?? [];
            arr.push({ t: Math.round(performance.now() - t0), html: ev.html, done: ev.done });
            writes.set(ev.key, arr);
          }
        }
      }
    } catch { /* stream closed */ }
  })();

  const tokens = JSON.parse(readFileSync(join(root, "design/tokens.json"), "utf8"));
  const designMd = readFileSync(join(root, "DESIGN.md"), "utf8");

  await design({ kind: "directions-begin", brief: b.brief, stack: "react-flutter", count: 3, screens: b.screens });
  const started = Math.round(performance.now() - t0);
  await api.jobs.idle();
  await new Promise((r) => setTimeout(r, 150));
  const view = await design({ kind: "directions-list" });
  const set = view.set;

  const directions = [];
  for (const d of set.directions) {
    const md = await design({ kind: "directions-md", id: d.id });
    const screens = [];
    for (const s of d.screens) {
      const finalHtml: string = await design({ kind: "directions-read", id: d.id, screen: s.id });
      const evs = writes.get(`directions/${d.id}/${s.id}`) ?? [];
      const last = evs.filter((e) => e.done).at(-1)?.html ?? "";
      const same = last === finalHtml;
      if (!same) console.warn(`note: ${d.id}/${s.id}: sanitised page differs from the streamed one; checkpoints are scaled`);
      const scale = last.length ? finalHtml.length / last.length : 1;
      // Checkpoints: [ms since the run started, characters of the page visible]. Partials are prefixes of the page.
      const marks = evs.map((e) => [e.t - started, Math.min(finalHtml.length, Math.round(e.html.length * (same ? 1 : scale)))]);
      screens.push({ id: s.id, title: s.title, html: finalHtml, marks });
    }
    // The fixture provider gives every screen of a direction the same layout, so the demo keeps the first screen.
    directions.push({ id: d.id, name: d.name, seed: d.seed, designMd: md.text ?? md, screens: screens.slice(0, 1) });
  }

  // Engineering: lock a direction, generate the screen under it, export it to each app as a reviewed diff.
  const code: Record<string, { stack: string; files: { path: string; status: string; lines: string[] }[] }> = {};
  for (const d of set.directions) {
    await design({ kind: "directions-select", directionId: d.id, notes: "" });
    const begun = await design({
      kind: "begin",
      step: "generate",
      name: b.screens[0],
      brief: b.brief,
      target: "web-desktop",
      count: 1,
    });
    await api.jobs.idle();
    for (const [i, stack] of ["web-spa", "mobile-rn"].entries()) {
      const prepared = await call("/api/export/prepare", {
        slug: begun.slug,
        file: "v1.html",
        app: i,
        feature: b.id === "members" ? "auth" : "orders",
        screen: b.screens[0]!.replace(/\W+/g, ""),
      });
      const files = (prepared.plan?.files ?? []).map((f: { path: string; status: string; diff: { kind: string; text: string }[] }) => ({
        path: f.path,
        status: f.status,
        lines: f.diff.filter((l) => l.kind === "add").map((l) => l.text),
      }));
      code[`${d.id}:${stack}`] = { stack, files };
    }
    await design({ kind: "directions-unlock" });
  }

  await reader.cancel().catch(() => {});
  await pump;
  rmSync(work, { recursive: true, force: true });
  return { id: b.id, label: b.label, brief: b.brief, preset: b.preset, designMd, tokens, directions, code, totalMs: Math.round(performance.now() - t0) - started };
}

const prev = (() => {
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return null;
  }
})();
const project = skipProject ? (prev?.project ?? null) : await recordProject();
const briefs = onlyProject && prev ? prev.briefs : [];
if (!onlyProject) {
  for (const b of BRIEFS) {
    console.log(`recording brief: ${b.id}`);
    briefs.push(await recordBrief(b));
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    note: "Recorded from a real run: Daedalus Studio server code with its fixture provider, plus the real `daedalus new` and `deno task check`.",
    recordedAt: new Date().toISOString().slice(0, 10),
    provider: "fake (deterministic fixtures)",
    project,
    briefs,
  }),
);
console.log(`wrote ${OUT}`);
