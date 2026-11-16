// Proves modules install: copies the template backend into a temp project, copies each module's files/, runs
// `modules:apply` (deno imports, env, contract, migration, ERD) and then the backend's own `deno task check`
// (format, lint, typecheck, every test including the modules' tests).
//   deno run -A modules/verify.ts email storage     (these modules)
//   deno run -A modules/verify.ts                   (all of them together)
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const template = join(here, "..", "template");
const SKIP = new Set(["node_modules", ".data", ".git"]);

export const listModules = () =>
  readdirSync(here, { withFileTypes: true }).filter((d) =>
    d.isDirectory() && existsSync(join(here, d.name, "module.json"))
  )
    .map((d) => d.name).sort();

function run(args: string[], cwd: string) {
  console.log(`\n> [${cwd}] deno ${args.join(" ")}`);
  const r = new Deno.Command(Deno.execPath(), { args, cwd, stdout: "inherit", stderr: "inherit" }).outputSync();
  if (!r.success) throw new Error(`failed: deno ${args.join(" ")}`);
}

/** Builds a project with the base backend plus the given modules and returns its folder. */
export function buildProject(ids: string[], dir = Deno.makeTempDirSync({ prefix: "daedalus-modules-" })): string {
  const filter = (src: string) => !src.split(/[\\/]/).some((p) => SKIP.has(p));
  for (const p of ["deno.json", "backend", "contracts", "packages/api_ts"]) {
    cpSync(join(template, p), join(dir, p), { recursive: true, filter });
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, ".blueprint.json"), JSON.stringify({ apps: [] }));
  for (const id of ids) cpSync(join(here, id, "files"), dir, { recursive: true });
  run(["install"], dir);
  run(["task", "--cwd", "backend", "modules:apply", ...ids], dir);
  return dir;
}

if (import.meta.main) {
  const ids = Deno.args.length ? Deno.args : listModules();
  const dir = buildProject(ids);
  try {
    run(["task", "--cwd", "backend", "check"], dir);
    console.log(`\nOK: ${ids.join(", ")}`);
  } finally {
    if (!Deno.env.get("KEEP")) rmSync(dir, { recursive: true, force: true });
    else console.log(`kept ${dir}`);
  }
}
