// Proves a database flavour works: copies the template backend, applies the flavour overlay (copy with overwrite, then
// remove the listed paths), optionally installs modules, and runs the backend's own `deno task check`.
//   deno run -A dbs/verify.ts mongodb [module ...]
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const template = join(here, "..", "template");
const modules = join(here, "..", "modules");
const SKIP = new Set(["node_modules", ".data", ".git"]);

function run(args: string[], cwd: string) {
  console.log(`\n> [${cwd}] deno ${args.join(" ")}`);
  const r = new Deno.Command(Deno.execPath(), { args, cwd, stdout: "inherit", stderr: "inherit" }).outputSync();
  if (!r.success) throw new Error(`failed: deno ${args.join(" ")}`);
}

/** The overlay contract (docs/MODULES.md, "Database flavours"): what the generator does for `--db <name>`. */
export function applyDb(project: string, dbDir: string) {
  const def = JSON.parse(Deno.readTextFileSync(join(dbDir, "db.json")));
  cpSync(join(dbDir, def.files ?? "files"), project, { recursive: true, force: def.overwrite === true });
  for (const p of def.remove ?? []) rmSync(join(project, p), { recursive: true, force: true });
}

export function buildProject(db: string, ids: string[], dir = Deno.makeTempDirSync({ prefix: "daedalus-db-" })) {
  const filter = (src: string) => !src.split(/[\\/]/).some((p) => SKIP.has(p));
  for (const p of ["deno.json", "backend", "contracts", "packages/api_ts"]) {
    cpSync(join(template, p), join(dir, p), { recursive: true, filter });
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, ".blueprint.json"), JSON.stringify({ apps: [] }));
  if (db !== "postgres") applyDb(dir, join(here, db));
  for (const id of ids) cpSync(join(modules, id, "files"), dir, { recursive: true });
  run(["install"], dir);
  run(["task", "--cwd", "backend", "diagrams"], dir);
  if (ids.length) run(["task", "--cwd", "backend", "modules:apply", ...ids], dir);
  return dir;
}

if (import.meta.main) {
  const [db = "mongodb", ...ids] = Deno.args;
  if (!existsSync(join(here, db, "db.json"))) throw new Error(`unknown flavour ${db}`);
  const dir = buildProject(db, ids);
  try {
    run(["task", "--cwd", "backend", "check"], dir);
    console.log(`\nOK: ${db} ${ids.join(", ")}`);
  } finally {
    if (!Deno.env.get("KEEP")) rmSync(dir, { recursive: true, force: true });
    else console.log(`kept ${dir}`);
  }
}
