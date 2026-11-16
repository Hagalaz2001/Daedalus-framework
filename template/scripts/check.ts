// Run before saying "done" and before pushing: `deno task check`, or `deno task check <folder-name>` for one folder.
// Order: sync, architecture boundaries, Deno-only rule, vulnerability audit, backend and shared packages, then every
// app's own commands from .blueprint.json (flutter analyze/test, cargo clippy/test, typecheck/lint/build ...) and the
// commands of applied modules and packs. A shared package builds into several apps, so a change to one can pass in one
// app and fail in another: check them all.
// `--json` prints one document on stdout: { ok, steps: [{ cwd, cmd, ok, exitCode, tail }] } (output of each step is captured).
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { appSteps, backendSteps } from "./check-plan.ts";

interface Cmd {
  cwd: string;
  run: string;
}
interface App {
  dir: string;
  check: Cmd[];
  audit?: { ignore: string[]; reason: string };
}
interface StepResult {
  cwd: string;
  cmd: string;
  ok: boolean;
  exitCode: number;
  tail?: string;
  /** Advisories deliberately not failing the audit, with the stacks and reasons that declared them. */
  ignored?: { id: string; stack: string; reason: string }[];
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

const manifest = JSON.parse(readFileSync(".blueprint.json", "utf8")) as { backend?: boolean; apps: App[]; extras?: { check: Cmd[] }[] };
const wanted = (dir: string) => !only || basename(dir) === only;

step(".", "deno task sync");
step(".", "deno task lint:boundaries");
step(".", "deno task lint:deno-only");
audit();

/**
 * `deno audit`, failing on every advisory except those a stack declared in stack.json `audit.ignore` (with a reason).
 * Ignored advisories are printed on every run so they stay visible. Deno's own --ignore only matches CVE ids, which
 * most npm advisories lack, so the report is parsed for GHSA ids instead.
 */
function audit() {
  const cwd = ".";
  const cmd = "deno audit";
  const declared = manifest.apps.flatMap((a) => (a.audit ? a.audit.ignore.map((id) => ({ id, stack: basename(a.dir), reason: a.audit!.reason })) : []));
  console.error(`\n> [${cwd}] ${cmd}`);
  const r = new Deno.Command(win ? "cmd" : "sh", { args: win ? ["/c", cmd] : ["-c", cmd], cwd, stdout: "piped", stderr: "piped" }).outputSync();
  const out = new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr);
  // deno-lint-ignore no-control-regex
  const plain = out.replace(/\u001b\[[0-9;]*m/g, "");
  const reported = new Set([...plain.matchAll(/advisories\/(GHSA-[a-z0-9-]+)/g)].map((m) => m[1]));
  const allowed = new Set(declared.map((d) => d.id));
  const unexpected = [...reported].filter((id) => !allowed.has(id));
  // A failure with no parsable advisory (network, registry error) stays a failure.
  const ok = r.success || (reported.size > 0 && unexpected.length === 0);
  for (const d of declared) console.error(`audit: ignoring ${d.id} (${d.stack}): ${d.reason}${reported.has(d.id) ? "" : " [no longer reported: remove it from stack.json]"}`);
  if (!ok) console.error(plain.trim().split("\n").slice(-40).join("\n"));
  results.push({
    cwd,
    cmd: declared.length ? `${cmd} (advisories ignored by stack.json: ${declared.map((d) => d.id).join(", ")})` : cmd,
    ok,
    exitCode: ok ? 0 : r.code || 1,
    ...(json ? { tail: plain.trim().split("\n").slice(-30).join("\n") } : {}),
    ...(declared.length ? { ignored: declared } : {}),
  });
}

// Shared TypeScript packages, the backend, then every app. Planning throws when something would be skipped silently.
const read = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);
if (wanted("packages/api_ts") && existsSync("packages/api_ts/package.json")) {
  const scripts = (JSON.parse(readFileSync("packages/api_ts/package.json", "utf8")).scripts ?? {}) as Record<string, string>;
  for (const s of ["typecheck", "lint", "test", "build"]) if (scripts[s]) step("packages/api_ts", `deno task ${s}`);
}
try {
  if (wanted("backend")) for (const s of backendSteps(manifest.backend === true || existsSync("backend"), read("backend/deno.json"), read("backend/package.json"))) step(s.cwd, s.cmd);
  for (const s of appSteps(manifest.apps.filter((a) => wanted(a.dir)))) step(s.cwd, s.cmd);
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  results.push({ cwd: ".", cmd: "plan: nothing may be skipped silently", ok: false, exitCode: 1, ...(json ? { tail: String(e instanceof Error ? e.message : e) } : {}) });
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
