// Daedalus generator: create a project from template/ + chosen stacks, or add an app, module or pack to one.
// Usually run through `daedalus` (cli.ts); `deno run -A new-project.ts ...` is the same thing.
//   deno run -A new-project.ts <dir> --name "Shop" --id com.yourco.shop --web spa|spa-vue|site|site-next|none (comma-combinable; the choices live in each stacks/<id>/stack.json "flag")
//        --mobile flutter|rn|none --desktop gpui|tauri|none --backend hono|none [--db postgres|mongodb] [--ui clean|editorial|playful] [--modules a,b] [--packs a,b]
//        [--git-name N --git-email E --remote URL] [--no-check]
//   deno run -A new-project.ts add-module <name>[,<name>] [--project <dir>]   (same for add-pack)
//   deno run -A new-project.ts add-app <stack> <name> [--project <dir>] [--id com.yourco.app] [--display "Name"]
// Missing flags are asked interactively. Windows and Mac.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import {
  addToManifest,
  applyDb,
  applyOverlay,
  assertValid,
  checkOverlay,
  type Cmd,
  composeStack,
  copyTree,
  DB_FLAVOURS,
  defaultOverlays,
  type DenoJson,
  flagChoices,
  isAppName,
  isBundleId,
  isDisplayName,
  listOverlays,
  listStacks,
  loadStack,
  type Manifest,
  mergeDenoJson,
  type OverlayKind,
  readManifest,
  readOverlayDef,
  resolveCmd,
  stacksFromFlags,
  UsageError,
  varsFor,
  writeManifest,
} from "./lib/blueprint.ts";
import { describe, formatDescribe, formatDocs, formatList, type ItemKind, list, searchDocs } from "./lib/catalog.ts";
import { runArgs, type RunResult, shell, tailOf } from "./template/scripts/lib/exec.ts";
import { validateGitInput } from "./template/scripts/git-setup.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** One command the generator ran. In JSON mode its output is captured (last lines) instead of streamed. */
export interface Step {
  cmd: string;
  cwd: string;
  ok: boolean;
  exitCode: number;
  tail?: string;
}
const ctx = { json: false, steps: [] as Step[] };
/** Progress text: stdout normally, stderr in JSON mode so stdout carries only the final JSON document. */
const say = (...a: unknown[]) => (ctx.json ? console.error(...a) : console.log(...a));
/** Records a finished step; `display` is what the log and the JSON report show. */
function record(display: string, cwd: string, r: RunResult): { ok: boolean; stdout: string } {
  ctx.steps.push({
    cmd: display,
    cwd,
    ok: r.ok,
    exitCode: r.code,
    ...(ctx.json ? { tail: tailOf(r.ok || !r.stderr ? r.stdout : r.stderr) } : {}),
  });
  return { ok: r.ok, stdout: r.stdout };
}
/** Fixed command line from a manifest (stack.json, module.json) through the shell. Never put user input in it. */
function sh(cmd: string, cwd: string): { ok: boolean; stdout: string } {
  say(`\n> [${cwd}] ${cmd}`);
  return record(cmd, cwd, shell(cmd, { cwd, capture: ctx.json }));
}
/** Program plus argument list, no shell: for everything that carries user input. */
function spawnStep(cmd: string, args: string[], cwd: string): { ok: boolean; stdout: string } {
  const display = [cmd, ...args].join(" ");
  say(`\n> [${cwd}] ${display}`);
  return record(display, cwd, runArgs(cmd, args, { cwd, capture: ctx.json }));
}
class StepError extends Error {
  override name = "StepError";
}
function must(cmd: string, cwd: string) {
  if (!sh(cmd, cwd).ok) throw new StepError(`Failed: ${cmd} (in ${cwd})`);
}

function ask(question: string, def?: string): string {
  if (ctx.json) return def ?? "";
  const a = prompt(`${question}${def ? ` [${def}]` : ""}:`);
  return (a ?? "").trim() || def || "";
}

function readJson<T>(f: string): T {
  return JSON.parse(readFileSync(f, "utf8")) as T;
}
function writeJson(f: string, v: unknown) {
  writeFileSync(f, JSON.stringify(v, null, 2) + "\n");
}

/** Short README for the generated project with the AI-assisted notice. */
function writeProjectReadme(target: string, name: string) {
  writeFileSync(
    join(target, "README.md"),
    `# ${name}

> AI-assisted project built with Daedalus: AI output can be wrong; the maintainers and AI providers are not liable and a
> named human is responsible for every change. See [DISCLAIMER.md](DISCLAIMER.md) and
> [docs/RESPONSIBLE-AI.md](docs/RESPONSIBLE-AI.md).

Describe the product in \`AGENTS.md\` ("This project") and \`PLAN.md\`. Start with \`deno task check\`; the commands are
listed in \`AGENTS.md\`, the architecture in \`docs/ARCHITECTURE.md\`, the contribution rules in \`CONTRIBUTING.md\`.
`,
  );
}

/** Applies modules or packs to a project: copies files, merges tasks and workspace, records them in the manifest. */
function applyExtras(projectDir: string, kind: OverlayKind, names: string[], manifest: Manifest, denoJson: DenoJson) {
  const installs: { cwd: string; run: string }[] = [];
  for (const name of names) {
    const r = applyOverlay({ blueprintDir: here, projectDir, kind, name, manifest });
    denoJson = mergeDenoJson(denoJson, { tasks: r.tasks, workspace: r.workspace }, name);
    manifest = { ...manifest, extras: [...(manifest.extras ?? []), r.extra] };
    installs.push(...r.install);
  }
  return { manifest, denoJson, installs };
}

/** Requested modules or packs; default packs (ai-kit) are always included unless `--packs none`. */
function selected(kind: OverlayKind, values: { modules?: string; packs?: string }): string[] {
  const asked = csv(kind === "module" ? values.modules : values.packs);
  if (kind === "module" || values.packs === "none") return asked;
  return [...new Set([...defaultOverlays(here, "pack"), ...asked])];
}

const csv = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter((x) => x && x !== "none");

type Result = Record<string, unknown>;

async function dispatch(argv: string[]): Promise<Result> {
  if (argv[0] === "add-app") return addApp(argv.slice(1));
  if (argv[0] === "add-module") return addOverlays("module", argv.slice(1));
  if (argv[0] === "add-pack") return addOverlays("pack", argv.slice(1));
  if (argv[0] === "sync" || argv[0] === "check") return projectTask(argv[0], argv.slice(1));
  if (argv[0] === "list" || argv[0] === "describe" || argv[0] === "docs") return catalogCommand(argv[0], argv.slice(1));
  return newProject(argv);
}

/**
 * Runs a command and returns its exit code. With `--json` anywhere in `argv`, stdout carries exactly one JSON document
 * (`{ ok, command, ..., steps }` or `{ ok: false, error: { kind, message }, steps }`), progress goes to stderr and no
 * prompt is shown. Exit codes: 0 success, 1 a step or check failed, 2 invalid input.
 */
export async function run(argv: string[] = Deno.args): Promise<number> {
  const args = argv.filter((a) => a !== "--json");
  ctx.json = args.length !== argv.length;
  ctx.steps = [];
  try {
    const result = await dispatch(args);
    if (ctx.json) console.log(JSON.stringify({ ok: true, ...result, steps: ctx.steps }, null, 2));
    return result.ok === false ? 1 : 0;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const kind = e instanceof UsageError ? "usage" : e instanceof StepError ? "step-failed" : "internal";
    if (ctx.json) console.log(JSON.stringify({ ok: false, error: { kind, message }, steps: ctx.steps }, null, 2));
    else console.error(`\nError: ${message}`);
    return kind === "usage" ? 2 : 1;
  }
}

const KINDS = ["stack", "module", "pack", "preset"] as const;
const kindOf = (v?: string): ItemKind => {
  const k = (v ?? "").replace(/s$/, "");
  assertValid((KINDS as readonly string[]).includes(k), `Kind must be one of: ${KINDS.join(", ")} (got "${v ?? ""}")`);
  return k as ItemKind;
};

/** Read-only: `list <kind>`, `describe <kind> <id>`, `docs <query>`. */
function catalogCommand(cmd: "list" | "describe" | "docs", args: string[]): Result {
  if (cmd === "list") {
    const kind = kindOf(args[0]);
    const items = list(here, kind);
    if (!ctx.json) console.log(formatList(kind, items));
    return { command: "list", kind, items };
  }
  if (cmd === "describe") {
    assertValid(!!args[1], "Usage: describe <stack|module|pack|preset> <id>");
    const item = describe(here, kindOf(args[0]), args[1]);
    if (!ctx.json) console.log(formatDescribe(item));
    return { command: "describe", item };
  }
  const query = args.join(" ");
  const results = searchDocs(here, query);
  if (!ctx.json) console.log(formatDocs(query, results));
  return { command: "docs", query, results };
}

/** `sync` and `check` for an existing project; `check` returns one entry per step (see docs/CLI.md). */
function projectTask(kind: "sync" | "check", args: string[]): Result {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { project: { type: "string" } } });
  const dir = resolve(positionals[0] ?? values.project ?? ".");
  readManifest(dir);
  if (kind === "sync") {
    must("deno task sync", dir);
    return { command: "sync", dir };
  }
  const r = sh(ctx.json ? "deno task check --json" : "deno task check", dir);
  if (!ctx.json) return { command: "check", dir, ok: r.ok };
  try {
    const report = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
    return { command: "check", dir, ok: report.ok, checks: report.steps };
  } catch {
    throw new StepError(`deno task check produced no JSON report in ${dir}`);
  }
}

function newProject(argv: string[]): Result {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: "string" },
      id: { type: "string" },
      web: { type: "string" },
      islands: { type: "string" },
      mobile: { type: "string" },
      desktop: { type: "string" },
      backend: { type: "string" },
      db: { type: "string" },
      ui: { type: "string" },
      modules: { type: "string" },
      packs: { type: "string" },
      "git-name": { type: "string" },
      "git-email": { type: "string" },
      remote: { type: "string" },
      "no-check": { type: "boolean" },
      yes: { type: "boolean" },
    },
  });
  const dirArg = positionals[0] ?? ask("Target folder");
  assertValid(!!dirArg, "Usage: deno run -A new-project.ts <dir> [flags]");
  const target = resolve(dirArg);
  assertValid(
    !existsSync(target) || (statSync(target).isDirectory() && readdirSync(target).length === 0),
    `Refusing to overwrite: ${target} already exists and is not an empty folder.`,
  );

  // Validate before anything is written: these values reach git (and git hooks), so shell syntax and options are refused.
  try {
    validateGitInput({ name: values["git-name"], email: values["git-email"], remote: values.remote });
  } catch (e) {
    throw new UsageError((e as Error).message);
  }
  assertValid(!values["git-name"] === !values["git-email"], "--git-name and --git-email go together");

  const interactive = !values.yes && !ctx.json;
  const name = values.name ?? (interactive ? ask("Display name", basename(target)) : basename(target));
  assertValid(isDisplayName(name), `--name must be plain text without quotes or <>&$\`{}, got: ${name}`);
  const web = values.web ??
    (interactive
      ? ask(
        `Website: ${
          flagChoices("web", here).split("|").join(" | ")
        } | none, comma-combinable (site = Astro, the default site)`,
        "none",
      )
      : "none");
  const mobile = values.mobile ??
    (interactive ? ask(`Mobile: ${flagChoices("mobile", here).split("|").join(" | ")} | none`, "none") : "none");
  const desktop = values.desktop ??
    (interactive ? ask(`Desktop: ${flagChoices("desktop", here).split("|").join(" | ")} | none`, "none") : "none");
  const backend = values.backend ?? (interactive ? ask("Backend: hono | none", "hono") : "hono");
  assertValid(backend === "hono" || backend === "none", `--backend must be hono or none, got: ${backend}`);
  const db = values.db ?? "postgres";
  assertValid((DB_FLAVOURS as readonly string[]).includes(db), `--db must be postgres or mongodb, got: ${db}`);
  assertValid(db === "postgres" || backend === "hono", `--db ${db} needs --backend hono`);
  const ui = values.ui ?? "clean";
  const presetFile = join(here, "template/design/presets", `${ui}.json`);
  assertValid(isAppName(ui) && existsSync(presetFile), `Unknown --ui preset "${ui}" (see template/design/presets)`);

  const islands = values.islands ?? "react";
  assertValid(islands === "react" || islands === "vue", `--islands must be react or vue, got: ${islands}`);
  const ids = stacksFromFlags({ web, mobile, desktop }, here);
  const stacks = ids.map((id) => loadStack(here, id));
  let bundleId = values.id;
  if (!bundleId && stacks.some((s) => s.kind === "mobile") && interactive) {
    bundleId = ask("Bundle id (reverse domain)", "com.example.app");
  }
  if (bundleId) assertValid(isBundleId(bundleId), `--id must look like com.company.app (lowercase), got: ${bundleId}`);

  for (const s of stacks) {
    if (s.requires?.backend === "required") assertValid(backend === "hono", `Stack ${s.id} needs --backend hono`);
  }
  say(`Available stacks: ${listStacks(here).join(", ")}`);
  for (const kind of ["module", "pack"] as const) {
    const wanted = selected(kind, values);
    const have = listOverlays(here, kind);
    for (const n of wanted) {
      assertValid(have.includes(n), `Unknown ${kind} "${n}" (available: ${have.join(", ") || "none"})`);
    }
  }
  // Fail before writing anything: every module and pack must find what it requires (db, backend, stacks, earlier modules).
  const facts = { db, backend: backend === "hono", stacks: ids, extras: [] as string[] };
  for (const kind of ["module", "pack"] as const) {
    for (const n of selected(kind, values)) {
      checkOverlay(kind, n, readOverlayDef(here, kind, n), facts);
      facts.extras.push(n);
    }
  }
  say(`Creating ${target} with: ${ids.join(", ") || "no apps"}${backend === "hono" ? " + hono backend" : ""}`);

  copyTree(join(here, "template"), target);
  if (existsSync(join(here, "CATALOG.md"))) copyTree(join(here, "CATALOG.md"), join(target, "docs", "CATALOG.md"));
  rmSync(join(target, "deno.lock"), { force: true }); // regenerated by deno install for the chosen stacks
  copyTree(presetFile, join(target, "design", "tokens.json"));
  rmSync(join(target, "design", "presets"), { recursive: true, force: true });
  if (backend === "none") rmSync(join(target, "backend"), { recursive: true, force: true });

  const slug = basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const dj = join(target, "deno.json");
  let denoJson = readJson<DenoJson>(dj);
  if (backend === "none") denoJson.workspace = (denoJson.workspace ?? []).filter((w) => w !== "./backend");
  let manifest: Manifest = { version: 2, name: slug, backend: backend === "hono", ui, db, apps: [] };

  const usedDirs = new Set<string>();
  const installs: { cwd: string; run: string }[] = [];
  for (const s of stacks) {
    let appDir = s.defaultAppDir;
    // Two stacks wanting the same folder (spa + site): the later one gets its stack suffix.
    if (usedDirs.has(appDir)) appDir = `${appDir}-${s.id.split("-").pop()}`;
    usedDirs.add(appDir);
    const { entry, tasks, workspace } = composeStack({
      projectDir: target,
      blueprintDir: here,
      stack: s,
      appDir,
      displayName: name,
      bundleId,
      projectName: slug,
      islands,
    });
    denoJson = mergeDenoJson(denoJson, { tasks, workspace }, entry.name);
    manifest = addToManifest(manifest, entry);
    const vars = varsFor({ appDir, displayName: name, bundleId });
    installs.push(...(s.install ?? []).map((c: Cmd) => resolveCmd(c, vars)));
  }
  if (backend === "hono") installs.push(...applyDb(here, target, db));
  for (const kind of ["module", "pack"] as const) {
    const r = applyExtras(target, kind, selected(kind, values), manifest, denoJson);
    ({ manifest, denoJson } = r);
    installs.push(...r.installs);
  }
  writeJson(dj, denoJson);
  writeManifest(target, manifest);
  for (const f of ["DISCLAIMER.md"]) if (existsSync(join(here, f))) copyTree(join(here, f), join(target, f));
  writeProjectReadme(target, name);

  must("git init -q -b main", target);
  must("deno install", target);
  for (const i of installs) must(i.run, join(target, i.cwd));
  must("deno task security:sync", target); // dependabot entries for the ecosystems present (docker, pub, cargo)
  must("deno task sync", target);
  if (!values["no-check"]) must("deno task check", target);

  const { "git-name": gitName, "git-email": gitEmail, remote } = values;
  if (gitName && gitEmail) {
    const a = ["run", "-A", "scripts/git-setup.ts", "--name", gitName, "--email", gitEmail, "--commit"];
    if (remote) a.push("--remote", remote);
    if (!spawnStep(Deno.execPath(), a, target).ok) throw new StepError(`Failed: git setup (in ${target})`);
  }
  say(`
Project ready: ${target}
Next:
  1. Describe the product under "This project" in AGENTS.md and fill DESIGN.md.
  2. Ask which git identity and remote this project uses, then: deno task git:setup --name ... --email ... [--remote ...]
     (nothing is committed until then). Run: deno task setup to install the pre-commit hook (see docs/DEVSECOPS.md).
  3. Open it in your AI coding tool; it follows AGENTS.md, docs/ARCHITECTURE.md and the add-feature skill.`);
  return {
    command: "new",
    dir: target,
    stacks: ids,
    apps: manifest.apps.map((a) => ({ stack: a.stack, dir: a.dir })),
    backend: manifest.backend,
    modules: selected("module", values),
    packs: selected("pack", values),
    ui,
    db,
    next: [
      'Describe the product under "This project" in AGENTS.md',
      "Ask which git identity and remote to use before the first commit",
    ],
  };
}

function addOverlays(kind: OverlayKind, args: string[]): Result {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { project: { type: "string" }, "no-check": { type: "boolean" } },
  });
  const projectDir = resolve(values.project ?? ".");
  const names = csv(
    positionals[0] ?? ask(`${kind} name(s), comma-separated (${listOverlays(here, kind).join(" | ")})`),
  );
  assertValid(names.length > 0, `Give at least one ${kind} name`);
  const dj = join(projectDir, "deno.json");
  const r = applyExtras(projectDir, kind, names, readManifest(projectDir), readJson<DenoJson>(dj));
  writeJson(dj, r.denoJson);
  writeManifest(projectDir, r.manifest);
  must("deno install", projectDir);
  for (const i of r.installs) must(i.run, join(projectDir, i.cwd));
  must("deno task security:sync", projectDir);
  must("deno task sync", projectDir);
  if (!values["no-check"]) must("deno task check", projectDir);
  say(`\nApplied ${kind}(s): ${names.join(", ")}.`);
  return { command: `add-${kind}`, dir: projectDir, applied: names };
}

function addApp(args: string[]): Result {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      project: { type: "string" },
      id: { type: "string" },
      display: { type: "string" },
      "no-check": { type: "boolean" },
    },
  });
  const projectDir = resolve(values.project ?? ".");
  const manifest = readManifest(projectDir);
  const stackId = positionals[0] ?? ask(`Stack (${listStacks(here).join(" | ")})`);
  const name = positionals[1] ?? ask("App folder name (lowercase)");
  assertValid(isAppName(name), `app name: lowercase letters, digits, - and _, got: ${name}`);
  const stack = loadStack(here, stackId);
  const appDir = `apps/${name}`;
  assertValid(!existsSync(join(projectDir, appDir)), `${appDir} already exists`);
  let bundleId = values.id;
  if (stack.kind === "mobile") bundleId ??= `com.example.${name.replace(/-/g, "_")}`;
  if (bundleId) assertValid(isBundleId(bundleId), `--id must look like com.company.app, got: ${bundleId}`);
  const displayName = values.display ?? name;
  assertValid(isDisplayName(displayName), `--display must be plain text, got: ${displayName}`);

  const { entry, tasks, workspace } = composeStack({
    projectDir,
    blueprintDir: here,
    stack,
    appDir,
    displayName,
    bundleId,
    projectName: manifest.name,
  });
  const dj = join(projectDir, "deno.json");
  writeJson(dj, mergeDenoJson(readJson<DenoJson>(dj), { tasks, workspace }, entry.name));
  writeManifest(projectDir, addToManifest(manifest, entry));
  mkdirSync(join(projectDir, "docs"), { recursive: true });
  const vars = varsFor({ appDir, displayName, bundleId });
  must("deno install", projectDir);
  for (const c of stack.install ?? []) {
    const r = resolveCmd(c, vars);
    must(r.run, join(projectDir, r.cwd));
  }
  must("deno task security:sync", projectDir);
  must("deno task sync", projectDir);
  if (!values["no-check"]) must("deno task check", projectDir);
  say(`\nAdded ${appDir} (${stackId}). Describe it in AGENTS.md "This project".`);
  return { command: "add-app", dir: projectDir, app: { stack: stackId, dir: appDir } };
}

if (import.meta.main) Deno.exit(await run());
