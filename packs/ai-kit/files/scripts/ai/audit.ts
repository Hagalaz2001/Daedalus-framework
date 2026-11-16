// Dependency audit: known vulnerabilities (`deno audit`) and licences of installed npm packages (node_modules).
// `deno task audit`. Exceptions live in .audit-allow.json: { "allow": ["package-name"] }, each reviewed by a human.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Class = "ok" | "blocked" | "unknown";
const BLOCKED = /(^|[\s(/])(A?GPL|LGPL|SSPL|BUSL|BSL|CC-BY-(NC|SA)|Elastic|Commons-Clause|Proprietary|UNLICENSED)/i;

/** SPDX expressions with OR are fine when one side is permissive; AND needs both sides fine. */
export function classify(license: string | undefined): Class {
  if (!license || /^\s*(see license|custom)/i.test(license)) return "unknown";
  const l = license.replace(/[()]/g, "");
  if (/ OR /i.test(l)) return l.split(/ OR /i).some((p) => classify(p) === "ok") ? "ok" : "blocked";
  return BLOCKED.test(l) ? "blocked" : "ok";
}

interface Pkg {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  licenses?: { type?: string }[];
}

export function* packages(nm: string): Generator<{ name: string; version: string; license?: string }> {
  if (!existsSync(nm)) return;
  for (const e of readdirSync(nm)) {
    if (e.startsWith(".")) continue;
    const p = join(nm, e);
    if (!statSync(p).isDirectory()) continue;
    if (e.startsWith("@")) {
      for (const s of readdirSync(p)) yield* one(join(p, s));
    } else yield* one(p);
  }
}
function* one(dir: string) {
  const f = join(dir, "package.json");
  if (!existsSync(f)) return;
  const j = JSON.parse(readFileSync(f, "utf8")) as Pkg;
  const license = typeof j.license === "string"
    ? j.license
    : j.license?.type ?? j.licenses?.map((x) => x.type).join(" OR ");
  yield { name: j.name ?? dir, version: j.version ?? "?", license };
  if (existsSync(join(dir, "node_modules"))) yield* packages(join(dir, "node_modules"));
}

export function licenseReport(nm: string, allow: string[] = []) {
  const blocked: string[] = [];
  const unknown: string[] = [];
  for (const p of packages(nm)) {
    if (allow.includes(p.name)) continue;
    const c = classify(p.license);
    if (c === "blocked") blocked.push(`${p.name}@${p.version}: ${p.license}`);
    if (c === "unknown") unknown.push(`${p.name}@${p.version}`);
  }
  return { blocked: [...new Set(blocked)], unknown: [...new Set(unknown)] };
}

if (import.meta.main) {
  let code = 0;
  const vuln = await new Deno.Command(Deno.execPath(), { args: ["audit"], stdout: "inherit", stderr: "inherit" })
    .output();
  if (!vuln.success) code = 1;
  const allow = existsSync(".audit-allow.json")
    ? (JSON.parse(readFileSync(".audit-allow.json", "utf8")).allow ?? [])
    : [];
  const r = licenseReport("node_modules", allow);
  for (const b of r.blocked) console.error(`licence not allowed: ${b}`);
  if (r.unknown.length) console.warn(`licence unknown (check by hand): ${r.unknown.join(", ")}`);
  if (r.blocked.length) code = 1;
  console.log(code ? "audit: problems found" : "audit: ok");
  Deno.exit(code);
}
