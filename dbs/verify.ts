// Proves a database flavour works: copies the template backend, applies the flavour overlay with the generator's own
// `applyDb`, optionally installs modules, and runs the backend's own `deno task check`. CI: `deno task verify:dbs`.
//   deno run -A dbs/verify.ts mongodb [module ...]
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProject as build, deno } from "../tools/build-project.ts";

const here = fileURLToPath(new URL(".", import.meta.url));

export const buildProject = (db: string, ids: string[], dir?: string) =>
  build({ db, ids, dir, prefix: "daedalus-db-" });

if (import.meta.main) {
  const [db = "mongodb", ...ids] = Deno.args;
  if (!existsSync(join(here, db, "db.json"))) throw new Error(`unknown flavour ${db}`);
  const dir = buildProject(db, ids);
  try {
    deno(["task", "--cwd", "backend", "check"], dir);
    console.log(`\nOK: ${db} ${ids.join(", ")}`);
  } finally {
    if (!Deno.env.get("KEEP")) rmSync(dir, { recursive: true, force: true });
    else console.log(`kept ${dir}`);
  }
}
