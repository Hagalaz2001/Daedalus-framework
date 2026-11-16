// Shared by modules/verify.ts and dbs/verify.ts: a scratch project made of the template's backend (plus an optional
// database flavour and modules), built with the same lib code the generator uses, then checked with the backend's own tasks.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { applyDb, copyFilterFor } from "../lib/blueprint.ts";
import { runArgs } from "../template/scripts/lib/exec.ts";

export const root = join(dirname(fromFileUrl(import.meta.url)), "..");

/** Runs `deno <args>` in `cwd`, streaming output; throws on failure. */
export function deno(args: string[], cwd: string) {
  console.log(`\n> [${cwd}] deno ${args.join(" ")}`);
  if (!runArgs(Deno.execPath(), args, { cwd }).ok) throw new Error(`failed: deno ${args.join(" ")}`);
}

/** Template backend + contracts + api client in a temp folder; flavour and module files applied; `modules:apply` run for `ids`. */
export function buildProject(o: { ids?: string[]; db?: string; prefix?: string; dir?: string } = {}): string {
  const dir = o.dir ?? Deno.makeTempDirSync({ prefix: o.prefix ?? "daedalus-verify-" });
  const ids = o.ids ?? [];
  for (const p of ["deno.json", "backend", "contracts", "packages/api_ts", "scripts"]) {
    cpSync(join(root, "template", p), join(dir, p), {
      recursive: true,
      filter: copyFilterFor(join(root, "template", p)),
    });
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, ".blueprint.json"), JSON.stringify({ apps: [] }));
  if (o.db) applyDb(root, dir, o.db);
  for (const id of ids) cpSync(join(root, "modules", id, "files"), dir, { recursive: true });
  deno(["install"], dir);
  if (ids.length) deno(["task", "--cwd", "backend", "modules:apply", ...ids], dir);
  deno(["task", "--cwd", "backend", "diagrams"], dir); // the backend check compares docs/diagrams with the schema
  return dir;
}
