// Run before saying "done" and before pushing: `deno task check`, or `deno task check <folder-name>` for one folder.
// Order: sync, architecture boundaries, Deno-only rule, vulnerability audit, backend and shared packages, then every
// app's own commands from .blueprint.json (flutter analyze/test, cargo clippy/test, typecheck/lint/build ...) and the
// commands of applied modules and packs. A shared package builds into several apps, so a change to one can pass in one
// app and fail in another: check them all.
// `--json` prints one document on stdout: { ok, steps: [{ cwd, cmd, ok, exitCode, tail }] } (output of each step is captured).
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

interface Cmd {
  cwd: string;
  run: string;
}
interface App {
  dir: string;
  check: Cmd[];
}
interface StepResult {
  cwd: string;
  cmd: string;
  ok: boolean;
  exitCode: number;
  tail?: string;
}

const json = Deno.args.includes("--json");
const only = Deno.args.find((a) => !a.startsWith("--"));
const results: StepResult[] = [];
const seen = new Set<string>();
const win = Deno.build.os === "windows";
const tailOf = (b: Uint8Array) => new TextDecoder().decode(b).split("\n").slice(-30).join("\n").trim();

function step(cwd: string, cmd: string) {
  const key = `${cwd}|${cmd}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.error(`\n> [${cwd}] ${cmd}`);
  const io = json ? "piped" : "inherit";
  const r = new Deno.Command(win ? "cmd" : "sh", { args: win ? ["/c", cmd] : ["-c", cmd], cwd, stdout: io, stderr: io }).outputSync();
  results.push({ cwd, cmd, ok: r.success, exitCode: r.code, ...(json ? { tail: tailOf(r.success ? r.stdout : r.stderr.length ? r.stderr : r.stdout) } : {}) });
}

const manifest = JSON.parse(readFileSync(".blueprint.json", "utf8")) as { apps: App[]; extras?: { check: Cmd[] }[] };
const wanted = (dir: string) => !only || basename(dir) === only;

step(".", "deno task sync");
step(".", "deno task lint:boundaries");
step(".", "deno task lint:deno-only");
step(".", "deno audit");

// Backend and shared TypeScript packages: whichever of these scripts their package.json defines.
for (const dir of ["packages/api_ts", "backend"]) {
  const pkg = join(dir, "package.json");
  if (!existsSync(pkg) || !wanted(dir)) continue;
  const scripts = (JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {}) as Record<string, string>;
  for (const s of ["typecheck", "lint", "test", "build"]) if (scripts[s]) step(dir, `deno task ${s}`);
}
for (const app of manifest.apps) {
  if (!wanted(app.dir)) continue;
  for (const c of app.check) step(c.cwd, c.run);
}
if (!only) for (const e of manifest.extras ?? []) for (const c of e.check) step(c.cwd, c.run);

const unknownFolder = only && !manifest.apps.some((a) => wanted(a.dir)) && !wanted("backend") && !wanted("packages/api_ts");
if (unknownFolder) {
  console.error(`Nothing named "${only}". Apps: ${manifest.apps.map((a) => basename(a.dir)).join(", ")}, backend, api_ts`);
  Deno.exit(2);
}
const failed = results.filter((r) => !r.ok);
if (json) console.log(JSON.stringify({ ok: failed.length === 0, steps: results }, null, 2));
else if (failed.length) console.error(`\nFAILED:\n  ${failed.map((r) => `${r.cwd}: ${r.cmd}`).join("\n  ")}`);
else console.error("\nAll checks passed.");
Deno.exit(failed.length ? 1 : 0);
