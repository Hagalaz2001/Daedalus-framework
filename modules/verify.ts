// Proves modules install: copies the template backend into a temp project, copies each module's files/, runs
// `modules:apply` (deno imports, env, contract, migration, ERD) and then the backend's own `deno task check`
// (format, lint, typecheck, every test including the modules' tests). CI: `deno task verify:modules`.
//   deno run -A modules/verify.ts email storage     (these modules)
//   deno run -A modules/verify.ts                   (all of them together)
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProject as build, deno } from "../tools/build-project.ts";

const here = fileURLToPath(new URL(".", import.meta.url));

export const listModules = () =>
  readdirSync(here, { withFileTypes: true }).filter((d) =>
    d.isDirectory() && existsSync(join(here, d.name, "module.json"))
  )
    .map((d) => d.name).sort();

/** Builds a project with the base backend plus the given modules and returns its folder. */
export const buildProject = (ids: string[], dir?: string) => build({ ids, dir, prefix: "daedalus-modules-" });

if (import.meta.main) {
  const ids = Deno.args.length ? Deno.args : listModules();
  const dir = buildProject(ids);
  try {
    deno(["task", "--cwd", "backend", "check"], dir);
    console.log(`\nOK: ${ids.join(", ")}`);
  } finally {
    if (!Deno.env.get("KEEP")) rmSync(dir, { recursive: true, force: true });
    else console.log(`kept ${dir}`);
  }
}
