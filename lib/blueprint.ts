// Core of the generator: stack.json loading, input validation, placeholders, composing a stack into a project,
// deno.json merge and the .blueprint.json manifest. No side effects at import time (tests import this).
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { blueprintRoot } from "./home.ts";
import { runArgs } from "../template/scripts/lib/exec.ts";

export type Cmd = string | { cwd?: string; run: string };
export type Kind = "web" | "mobile" | "desktop";
/** "shared" folders hold packages other stacks copy in; they cannot be chosen on their own. */
export type StackKind = Kind | "shared";

export interface StackDef {
  id: string;
  kind: StackKind;
  /** Value of the generator flag for this stack (`--web spa`, `--mobile rn`): unique within its kind. */
  flag?: string;
  label?: string;
  defaultAppDir: string;
  /** Folder inside the stack copied to the app dir. Default "app". */
  appSource?: string;
  /** Added to the root deno.json workspace (TypeScript apps). */
  workspaceMember: boolean;
  /** "packages/api_ts" = base package; "stack:packages/x" = copied from this stack; "shared:<stack>/packages/x" = copied from another folder under stacks/. */
  packages?: string[];
  /** Stack folder copied into the project's scripts/ (for tasks and tokens). */
  scripts?: string;
  tasks?: Record<string, Cmd>;
  replace?: { files?: string[]; from: string; to: string; regex?: boolean; raw?: boolean }[];
  move?: { from: string; to: string }[];
  install?: Cmd[];
  sync?: Cmd[];
  /** Turns design/tokens.json into this stack's theme file: a script path inside the stack folder (copied to scripts/tokens/, run with the app dir), or a full command run from the project root. */
  tokens?: string;
  /** `{token}` -> value in the listed files of the app (paths relative to the app dir). */
  placeholders?: Record<string, string[]>;
  check: Cmd[];
  boundaries?: { lang: "ts" | "dart"; src: string };
  /**
   * Variants selected by a generator flag (today `islands` for the Astro site): the chosen value adds its `packages`,
   * copies its `overlay` folder (relative to the stack folder) over the app, and replaces `tokens`.
   */
  variants?: {
    key: "islands";
    default: string;
    values: Record<string, { packages?: string[]; overlay?: string; tokens?: string }>;
  };
  /** Advisories `deno audit` may report for this stack (e.g. dev-only tooling). `reason` is required and printed on every check. */
  audit?: AuditIgnore;
  requires?: { backend?: "optional" | "required" | "none" };
}

export interface AuditIgnore {
  ignore: string[];
  reason: string;
}

export const ADVISORY_ID = /^(GHSA(-[23456789cfghjmpqrvwx]{4}){3}|CVE-\d{4}-\d{4,})$/;

export function validateAudit(a: AuditIgnore | undefined, where: string) {
  if (!a) return;
  assertValid(Array.isArray(a.ignore) && a.ignore.length > 0, `${where}: audit.ignore must be a non-empty list`);
  for (const id of a.ignore) {
    assertValid(
      typeof id === "string" && ADVISORY_ID.test(id),
      `${where}: audit.ignore entry "${id}" is not a GHSA or CVE id`,
    );
  }
  assertValid(
    typeof a.reason === "string" && a.reason.trim().length >= 10,
    `${where}: audit.reason is required (say why the advisory is acceptable)`,
  );
}

export interface ResolvedCmd {
  cwd: string;
  run: string;
}
export interface AppEntry {
  stack: string;
  kind: Kind;
  dir: string;
  name: string;
  bundleId?: string;
  check: ResolvedCmd[];
  sync: ResolvedCmd[];
  /** Command, run from the project root, that writes the theme file from design/tokens.json. */
  tokens?: string;
  boundaries?: { lang: "ts" | "dart"; src: string };
  audit?: AuditIgnore;
}
export interface Manifest {
  version: 2;
  name: string;
  backend: boolean;
  ui?: string;
  /** Database flavour of the backend: postgres (default) or mongodb. */
  db?: string;
  apps: AppEntry[];
  /** Applied modules and packs, with the commands they add to sync and check. */
  extras?: Extra[];
}

export const MANIFEST = ".blueprint.json";

// ---------- validation ----------
export const isBundleId = (s: string) => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(s);
export const isAppName = (s: string) => /^[a-z][a-z0-9_-]*$/.test(s);
// Display names end up inside XML, Dart strings and regex replacements: keep them plain.
export const isDisplayName = (s: string) => s.length > 0 && s.length <= 60 && !/['"\\<>&$`{}\n]/.test(s);
export const isAppDir = (s: string) => /^apps\/[a-z][a-z0-9_-]*$/.test(s);

/** Bad input from the caller (flags, names, existing folders). The CLI maps it to exit code 2. */
export class UsageError extends Error {
  override name = "UsageError";
}

export function assertValid(ok: boolean, msg: string) {
  if (!ok) throw new UsageError(msg);
}

// ---------- stacks ----------
export function loadStack(blueprintDir: string, id: string): StackDef & { root: string } {
  assertValid(/^[a-z0-9][a-z0-9_-]*$/.test(id), `Invalid stack id "${id}"`);
  const root = join(blueprintDir, "stacks", id);
  const f = join(root, "stack.json");
  assertValid(existsSync(f), `Unknown or unfinished stack "${id}" (no ${f})`);
  const def = JSON.parse(readFileSync(f, "utf8")) as StackDef;
  assertValid(def.id === id, `${f}: id "${def.id}" does not match folder "${id}"`);
  assertValid(
    ["web", "mobile", "desktop", "shared"].includes(def.kind),
    `${f}: kind must be web, mobile, desktop or shared`,
  );
  if (def.kind !== "shared") {
    validateAudit(def.audit, f);
    assertValid(isAppDir(def.defaultAppDir), `${f}: defaultAppDir must look like apps/<name>`);
    assertValid(Array.isArray(def.check), `${f}: check must be an array`);
  }
  return { ...def, root };
}

export function listStacks(blueprintDir: string): string[] {
  const dir = join(blueprintDir, "stacks");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) =>
      existsSync(join(dir, d, "stack.json")) &&
      JSON.parse(readFileSync(join(dir, d, "stack.json"), "utf8")).kind !== "shared"
    )
    .sort();
}

const KINDS: Kind[] = ["web", "mobile", "desktop"];

/** Flag value -> stack id per kind (--web spa, --mobile rn ...), read from each stack.json's `flag`. The one registry. */
export function stackFlags(blueprintDir = blueprintRoot()): Record<Kind, Record<string, string>> {
  const out: Record<Kind, Record<string, string>> = { web: {}, mobile: {}, desktop: {} };
  for (const id of listStacks(blueprintDir)) {
    const def = loadStack(blueprintDir, id);
    if (def.flag && def.kind !== "shared") out[def.kind][def.flag] = id;
  }
  return out;
}

/** "spa|spa-vue|site|site-next" for the help text and prompts. */
export const flagChoices = (kind: Kind, blueprintDir = blueprintRoot()) =>
  Object.keys(stackFlags(blueprintDir)[kind]).join("|");

// Maps generator flags to stack ids; "none" and "" mean nothing. Only --web takes a comma list.
export function stacksFromFlags(
  f: { web?: string; mobile?: string; desktop?: string },
  blueprintDir = blueprintRoot(),
): string[] {
  const flags = stackFlags(blueprintDir);
  const out: string[] = [];
  for (const kind of KINDS) {
    const raw = f[kind] ?? "none";
    const values = (kind === "web" ? raw.split(",") : [raw]).map((s) => s.trim()).filter((s) => s && s !== "none");
    for (const v of values) {
      assertValid(v in flags[kind], `--${kind} must be ${Object.keys(flags[kind]).join(", ")} or none (got "${v}")`);
      out.push(flags[kind][v]);
    }
  }
  return out;
}

// ---------- placeholders ----------
export type Vars = Record<string, string>;
export const subst = (s: string, vars: Vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

export function varsFor(
  o: { appDir: string; name?: string; displayName?: string; bundleId?: string; projectName?: string; islands?: string },
): Vars {
  const appName = basename(o.appDir).replace(/-/g, "_");
  const bundleId = o.bundleId ?? `com.example.${appName}`;
  return {
    appDir: o.appDir,
    appName,
    appSlug: basename(o.appDir),
    displayName: o.displayName ?? o.name ?? appName,
    projectName: o.projectName ?? "",
    islands: o.islands ?? "react",
    bundleId,
    bundlePath: bundleId.split(".").join("/"),
  };
}

export const resolveCmd = (c: Cmd, vars: Vars): ResolvedCmd => {
  const o = typeof c === "string" ? { run: c } : c;
  return { cwd: subst(o.cwd ?? ".", vars), run: subst(o.run, vars) };
};

const TEXT =
  /\.(json|ya?ml|md|mdx|ts|tsx|js|jsx|mjs|cjs|dart|kt|kts|java|swift|plist|xml|gradle|properties|pbxproj|html|css|toml|rs|txt|env|example|gitignore)$/i;

export function walk(
  dir: string,
  skip = new Set(["node_modules", ".git", "build", "dist", ".dart_tool", "target", ".next"]),
): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, skip));
    else out.push(p);
  }
  return out;
}

/** Applies a stack's replace rules inside one app/package directory. Rules whose result equals the input are no-ops. */
export function applyReplacements(root: string, rules: NonNullable<StackDef["replace"]>, vars: Vars) {
  const files = walk(root).filter((f) => TEXT.test(f));
  for (const r of rules) {
    const to = subst(r.to, vars);
    const from = r.raw ? r.from : subst(r.from, vars);
    if (!r.regex && from === to) continue;
    const only = r.files?.map((x) => join(root, x));
    for (const f of files) {
      if (only && !only.includes(f)) continue;
      const src = readFileSync(f, "utf8");
      const next = r.regex ? src.replace(new RegExp(from, "gm"), to) : src.split(from).join(to);
      if (next !== src) writeFileSync(f, next);
    }
  }
}

/** Moves a directory and removes the empty parents it leaves behind (stops at `stop`). */
export function moveDir(root: string, from: string, to: string) {
  const a = join(root, from);
  const b = join(root, to);
  if (!existsSync(a) || a === b) return;
  mkdirSync(dirname(b), { recursive: true });
  renameSync(a, b);
  for (let d = dirname(a); d.length > root.length && existsSync(d) && readdirSync(d).length === 0; d = dirname(d)) {
    rmSync(d, { recursive: true });
  }
}

// ---------- compose ----------
// Build output and machine-local tool files never ship, even from a checkout where Flutter, Node or Cargo already ran
// (Flutter writes absolute local paths into Generated.xcconfig and flutter_export_environment.sh).
const COPY_SKIP = new Set([
  "node_modules",
  "dist",
  "build",
  ".dart_tool",
  "Pods",
  ".idea",
  ".gradle",
  "ephemeral",
  ".data",
  ".autopilot",
  "target",
  ".next",
  ".expo",
  "Generated.xcconfig",
  "flutter_export_environment.sh",
  ".flutter-plugins",
  ".flutter-plugins-dependencies",
  ".packages",
]);
export const copyFilter = (src: string) =>
  !COPY_SKIP.has(basename(src)) && !src.endsWith(".iml") && !/\.log$/.test(src) && !/[\\/]docs[\\/]screens$/.test(src);

/** Paths under `root` that git ignores (collapsed to the topmost ignored folder). Empty outside a git checkout. */
const ignoredCache = new Map<string, Set<string>>();
export function gitIgnored(root: string): Set<string> {
  const key = resolve(root);
  let out = ignoredCache.get(key);
  if (!out) {
    out = new Set();
    try {
      const cwd = statSync(key).isDirectory() ? key : dirname(key);
      const r = runArgs("git", ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"], {
        cwd,
        capture: true,
      });
      if (r.ok) { for (const p of r.stdout.split("\0")) if (p) out.add(resolve(cwd, p.replace(/\/$/, ""))); }
    } catch { /* no git: the fixed skip list still applies */ }
    ignoredCache.set(key, out);
  }
  return out;
}

/** The copy filter for a source folder: the fixed skip list plus everything the repo's .gitignore files exclude. */
export function copyFilterFor(root: string): (src: string) => boolean {
  const ignored = gitIgnored(root);
  return (src) => copyFilter(src) && !ignored.has(resolve(src));
}

export function copyTree(from: string, to: string) {
  cpSync(from, to, { recursive: true, filter: statSync(from).isDirectory() ? copyFilterFor(from) : copyFilter });
}

export interface ComposeOpts {
  projectDir: string;
  blueprintDir: string;
  stack: StackDef & { root: string };
  appDir: string;
  displayName?: string;
  bundleId?: string;
  projectName?: string;
  /** UI framework for interactive islands in the Astro site stack. */
  islands?: string;
}

/** Copies one stack into the project and returns its manifest entry, the deno.json tasks and workspace members it adds. */
export function composeStack(o: ComposeOpts): { entry: AppEntry; tasks: Record<string, string>; workspace: string[] } {
  const { stack, projectDir } = o;
  assertValid(isAppDir(o.appDir), `app dir must look like apps/<name>, got "${o.appDir}"`);
  const dest = join(projectDir, o.appDir);
  assertValid(!existsSync(dest), `${o.appDir} already exists`);
  const vars = varsFor({ ...o });
  const workspace: string[] = [];
  const choice = stack.variants ? (o.islands ?? stack.variants.default) : undefined;
  const variant = stack.variants && choice ? stack.variants.values[choice] : undefined;
  if (stack.variants) {
    assertValid(
      !!variant,
      `--${stack.variants.key} must be one of: ${Object.keys(stack.variants.values).join(", ")} (got "${choice}")`,
    );
  }

  // The app is the stack "app" folder, else its single apps/<name>, else the stack folder itself minus packages.
  let src = join(stack.root, stack.appSource ?? "app");
  let rootCopy = false;
  if (!existsSync(src)) {
    const alt = join(stack.root, "apps");
    const sub = existsSync(alt) ? readdirSync(alt).filter((d) => statSync(join(alt, d)).isDirectory()) : [];
    if (sub.length === 1) src = join(alt, sub[0]);
    else {
      src = stack.root;
      rootCopy = true;
    }
  }
  mkdirSync(dirname(dest), { recursive: true });
  const NOT_APP = new Set(["stack.json", "packages"]);
  const keep = copyFilterFor(src);
  cpSync(src, dest, {
    recursive: true,
    filter: (f) => keep(f) && !(rootCopy && NOT_APP.has(basename(f)) && dirname(f) === src),
  });

  // The variant overlay replaces files of the app copy; the variants/ folder itself never ships.
  if (variant?.overlay) {
    cpSync(join(stack.root, variant.overlay), dest, {
      recursive: true,
      filter: copyFilterFor(join(stack.root, variant.overlay)),
    });
  }
  rmSync(join(dest, "variants"), { recursive: true, force: true });

  for (const p of [...(stack.packages ?? []), ...(variant?.packages ?? [])]) {
    const m = /^(stack|shared):(.+)$/.exec(p);
    if (!m) continue;
    const parts = m[2].split("/");
    const [fromDir, rel] = m[1] === "stack"
      ? [stack.root, m[2]]
      : [join(stack.root, "..", parts[0]), parts.slice(1).join("/")];
    const to = join(projectDir, rel);
    if (existsSync(to)) continue; // shared by every app that needs it: copy once
    copyTree(join(fromDir, rel), to);
    if (stack.workspaceMember && (existsSync(join(to, "package.json")) || existsSync(join(to, "deno.json")))) {
      workspace.push(`./${rel}`);
    }
  }
  if (stack.scripts && existsSync(join(stack.root, stack.scripts))) {
    for (const f of readdirSync(join(stack.root, stack.scripts))) {
      const to = join(projectDir, "scripts", f);
      if (!existsSync(to)) copyTree(join(stack.root, stack.scripts, f), to);
    }
  }
  // Placeholder rules touch only the app; package-level text has no placeholders.
  const rules = [
    ...(stack.replace ?? []),
    ...Object.entries(stack.placeholders ?? {}).map(([token, files]) => ({
      files,
      from: token,
      to: subst(token, vars),
      raw: true,
    })),
  ];
  applyReplacements(dest, rules, vars);
  for (const m of stack.move ?? []) moveDir(dest, subst(m.from, vars), subst(m.to, vars));

  const tokenSrc = variant?.tokens ?? stack.tokens;
  let tokens: string | undefined;
  if (tokenSrc && /\s/.test(tokenSrc)) tokens = subst(tokenSrc, vars);
  else if (tokenSrc) {
    const script = `scripts/tokens/${stack.id}.ts`;
    mkdirSync(join(projectDir, "scripts", "tokens"), { recursive: true });
    cpSync(join(stack.root, tokenSrc), join(projectDir, script));
    tokens = `deno run -A ${script} ${o.appDir}`;
  }

  const tasks: Record<string, string> = {};
  for (const [name, c] of Object.entries(stack.tasks ?? {})) {
    const r = resolveCmd(c, vars);
    tasks[name] = r.cwd === "." ? r.run : `cd ${r.cwd} && ${r.run}`;
  }
  if (stack.workspaceMember) workspace.push(`./${o.appDir}`);
  return {
    entry: {
      stack: stack.id,
      kind: stack.kind as Kind,
      dir: o.appDir,
      name: vars.appName,
      ...(stack.kind === "mobile" ? { bundleId: vars.bundleId } : {}),
      check: stack.check.map((c) => resolveCmd(c, vars)),
      sync: (stack.sync ?? []).map((c) => resolveCmd(c, vars)),
      tokens,
      audit: stack.audit,
      boundaries: stack.boundaries ??
        (existsSync(join(dest, "src", "features")) ? { lang: "ts", src: "src" } : undefined),
    },
    tasks,
    workspace,
  };
}

// ---------- deno.json + manifest ----------
export interface DenoJson {
  workspace?: string[];
  tasks?: Record<string, string>;
  [k: string]: unknown;
}

/** Adds workspace members and tasks. A task name already taken gets ":<appName>" so a second app never overwrites the first. */
export function mergeDenoJson(
  dj: DenoJson,
  add: { tasks: Record<string, string>; workspace?: string[] },
  appName: string,
): DenoJson {
  const out: DenoJson = { ...dj, workspace: [...(dj.workspace ?? [])], tasks: { ...(dj.tasks ?? {}) } };
  for (const w of add.workspace ?? []) if (!out.workspace!.includes(w)) out.workspace!.push(w);
  for (const [k, v] of Object.entries(add.tasks)) {
    if (out.tasks![k] === v) continue;
    const key = k in out.tasks! ? `${k}:${appName}` : k;
    out.tasks![key] = v;
  }
  return out;
}

export function readManifest(projectDir: string): Manifest {
  const f = join(projectDir, MANIFEST);
  assertValid(existsSync(f), `${f} not found: not a Daedalus project`);
  const m = JSON.parse(readFileSync(f, "utf8")) as Manifest;
  assertValid(
    m.version === 2,
    `${f}: manifest version ${m.version} is not supported by this Daedalus (expects 2); update Daedalus`,
  );
  return m;
}
export function writeManifest(projectDir: string, m: Manifest) {
  writeFileSync(join(projectDir, MANIFEST), JSON.stringify(m, null, 2) + "\n");
}
export function addToManifest(m: Manifest, e: AppEntry): Manifest {
  assertValid(!m.apps.some((a) => a.dir === e.dir), `${e.dir} is already in the manifest`);
  return { ...m, apps: [...m.apps, e] };
}

export const relPosix = (a: string, b: string) => relative(a, b).split("\\").join("/");

// ---------- modules and packs ----------
// Both are overlays: a folder under modules/<name>/ or packs/<name>/ with a module.json or pack.json and a files/ folder
// copied into the project. Recognised keys (all optional): files, tasks, workspace, install, sync, check, requires.
export type OverlayKind = "module" | "pack";
export interface OverlayDef {
  name?: string;
  files?: string;
  tasks?: Record<string, Cmd>;
  workspace?: string[];
  install?: Cmd[];
  sync?: Cmd[];
  check?: Cmd[];
  requires?: { backend?: boolean | string; stacks?: string[]; modules?: string[]; db?: string };
  /** Markdown file (relative to the overlay folder) appended to the project AGENTS.md under "## Pack: <name>". */
  rules?: string;
  /** Applied to every new project unless `--packs none`. */
  default?: boolean;
}
export interface Extra {
  kind: OverlayKind;
  name: string;
  sync: ResolvedCmd[];
  check: ResolvedCmd[];
}

export function listOverlays(blueprintDir: string, kind: OverlayKind): string[] {
  const dir = join(blueprintDir, `${kind}s`);
  return existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, `${kind}.json`))).sort() : [];
}

/** Overlays that apply to every new project (`"default": true` in their manifest). */
export function defaultOverlays(blueprintDir: string, kind: OverlayKind): string[] {
  return listOverlays(blueprintDir, kind).filter((n) => {
    const f = join(blueprintDir, `${kind}s`, n, `${kind}.json`);
    return (JSON.parse(readFileSync(f, "utf8")) as OverlayDef).default === true;
  });
}

const SETTINGS = ".claude/settings.json";

/** Merges two Claude settings objects: hook entries are concatenated per event without duplicates, other keys are kept (existing wins). */
export function mergeSettings(
  existing: Record<string, unknown>,
  add: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...add, ...existing };
  const a = (existing.hooks ?? {}) as Record<string, unknown[]>;
  const b = (add.hooks ?? {}) as Record<string, unknown[]>;
  if (existing.hooks || add.hooks) {
    const hooks: Record<string, unknown[]> = {};
    for (const event of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const seen = new Set<string>();
      hooks[event] = [...(a[event] ?? []), ...(b[event] ?? [])].filter((h) =>
        !seen.has(JSON.stringify(h)) && seen.add(JSON.stringify(h))
      );
    }
    out.hooks = hooks;
  }
  return out;
}

/** What a project has when an overlay is applied: used both before anything is written and by applyOverlay. */
export interface ProjectFacts {
  db: string;
  backend: boolean;
  stacks: string[];
  /** Names of modules and packs already applied (or selected earlier in the same command). */
  extras: string[];
}

/** Throws a UsageError when the project lacks something the overlay's `requires` asks for. The one place these rules live. */
export function checkOverlay(kind: OverlayKind, name: string, def: OverlayDef, have: ProjectFacts) {
  const req = def.requires ?? {};
  if (req.db) assertValid(have.db === req.db, `${kind} "${name}" needs --db ${req.db}, this project uses ${have.db}`);
  if (req.backend) assertValid(have.backend, `${kind} "${name}" needs the backend (generate with --backend hono)`);
  for (const s of req.stacks ?? []) assertValid(have.stacks.includes(s), `${kind} "${name}" needs the ${s} stack`);
  for (const m of req.modules ?? []) {
    assertValid(have.extras.includes(m), `${kind} "${name}" needs the "${m}" module applied first`);
  }
}

export const readOverlayDef = (blueprintDir: string, kind: OverlayKind, name: string): OverlayDef =>
  JSON.parse(readFileSync(join(blueprintDir, `${kind}s`, name, `${kind}.json`), "utf8")) as OverlayDef;

export function applyOverlay(
  o: { blueprintDir: string; projectDir: string; kind: OverlayKind; name: string; manifest: Manifest },
): { extra: Extra; tasks: Record<string, string>; workspace: string[]; install: ResolvedCmd[] } {
  assertValid(isAppName(o.name), `${o.kind} name: lowercase letters, digits, - and _, got: ${o.name}`);
  const root = join(o.blueprintDir, `${o.kind}s`, o.name);
  const f = join(root, `${o.kind}.json`);
  assertValid(
    existsSync(f),
    `Unknown ${o.kind} "${o.name}" (available: ${listOverlays(o.blueprintDir, o.kind).join(", ") || "none"})`,
  );
  assertValid(
    !(o.manifest.extras ?? []).some((e) => e.kind === o.kind && e.name === o.name),
    `${o.kind} "${o.name}" is already applied`,
  );
  const def = JSON.parse(readFileSync(f, "utf8")) as OverlayDef;
  checkOverlay(o.kind, o.name, def, {
    db: o.manifest.db ?? "postgres",
    backend: o.manifest.backend,
    stacks: o.manifest.apps.map((a) => a.stack),
    extras: (o.manifest.extras ?? []).map((e) => e.name),
  });
  const vars = varsFor({ appDir: "apps/app", projectName: o.manifest.name });

  const files = join(root, def.files ?? "files");
  if (existsSync(files)) {
    // Refuse to overwrite: an overlay adds files, it never silently replaces project code.
    const all = walk(files).map((p) => relPosix(files, p));
    for (const rel of all) {
      assertValid(
        rel === SETTINGS || !existsSync(join(o.projectDir, rel)),
        `${o.kind} "${o.name}" would overwrite ${rel}`,
      );
    }
    for (const rel of all) {
      const to = join(o.projectDir, rel);
      mkdirSync(dirname(to), { recursive: true });
      if (rel === SETTINGS && existsSync(to)) {
        const merged = mergeSettings(
          JSON.parse(readFileSync(to, "utf8")),
          JSON.parse(readFileSync(join(files, rel), "utf8")),
        );
        writeFileSync(to, JSON.stringify(merged, null, 2) + "\n");
      } else cpSync(join(files, rel), to);
    }
  }
  if (def.rules && existsSync(join(root, def.rules)) && existsSync(join(o.projectDir, "AGENTS.md"))) {
    const agents = join(o.projectDir, "AGENTS.md");
    const text = readFileSync(agents, "utf8").replace(/\s*$/, "\n");
    writeFileSync(
      agents,
      `${text}\n## ${o.kind === "pack" ? "Pack" : "Module"}: ${o.name}\n\n${
        readFileSync(join(root, def.rules), "utf8").trim()
      }\n`,
    );
  }
  const tasks: Record<string, string> = {};
  for (const [k, c] of Object.entries(def.tasks ?? {})) {
    const r = resolveCmd(c, vars);
    tasks[k] = r.cwd === "." ? r.run : `cd ${r.cwd} && ${r.run}`;
  }
  return {
    extra: {
      kind: o.kind,
      name: o.name,
      sync: (def.sync ?? []).map((c) => resolveCmd(c, vars)),
      check: (def.check ?? []).map((c) => resolveCmd(c, vars)),
    },
    tasks,
    workspace: def.workspace ?? [],
    install: (def.install ?? []).map((c) => resolveCmd(c, vars)),
  };
}

// ---------- database flavours ----------
export const DB_FLAVOURS = ["postgres", "mongodb"] as const;

export interface DbDef {
  files?: string;
  overwrite?: boolean;
  remove?: string[];
  install?: Cmd[];
  env?: Record<string, string>;
}

/**
 * Applies `dbs/<name>/db.json` to a project: copy `files` (overwriting when `overwrite` is set), delete the `remove`
 * paths, append `env` to `.env.example`, and return the install commands. `postgres` is the template itself.
 */
export function applyDb(blueprintDir: string, projectDir: string, name: string): ResolvedCmd[] {
  assertValid((DB_FLAVOURS as readonly string[]).includes(name), `--db must be postgres or mongodb, got: ${name}`);
  if (name === "postgres") return [];
  const dir = join(blueprintDir, "dbs", name);
  assertValid(existsSync(join(dir, "db.json")), `Unknown database flavour "${name}"`);
  const def = JSON.parse(readFileSync(join(dir, "db.json"), "utf8")) as DbDef;
  cpSync(join(dir, def.files ?? "files"), projectDir, { recursive: true, force: def.overwrite === true });
  for (const p of def.remove ?? []) rmSync(join(projectDir, p), { recursive: true, force: true });
  const env = Object.entries(def.env ?? {});
  if (env.length) {
    const f = join(projectDir, ".env.example");
    const old = existsSync(f) ? readFileSync(f, "utf8").replace(/\s*$/, "\n") : "";
    writeFileSync(f, old + env.map(([k, v]) => `${k}=${v}\n`).join(""));
  }
  const vars = varsFor({ appDir: "apps/app" });
  return (def.install ?? []).map((c) => resolveCmd(c, vars));
}
