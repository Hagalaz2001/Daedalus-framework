// Bridge to the Daedalus checkout. Add another app of any stack (admin SPA, second mobile app, desktop app ...): `deno task add-app <stack> <name> [--id com.x.y]`,
// optional feature modules: `deno task add-module <name>[,<name>]`,
// or the design studio: `deno task studio`.
// The generator owns the stack templates, so this finds the Daedalus folder and delegates to it.
//   Lookup order: --daedalus <dir>, $DAEDALUS_HOME, a daedalus or daedalus-framework folder next to or above this project, ~/daedalus.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = [...Deno.args];
const i = args.indexOf("--daedalus");
const flagDir = i >= 0 ? args.splice(i, 2)[1] : undefined;

function findDaedalus(): string | undefined {
  const candidates = [flagDir, Deno.env.get("DAEDALUS_HOME")];
  for (let d = resolve("."); dirname(d) !== d; d = dirname(d)) for (const n of ["daedalus", "daedalus-framework"]) candidates.push(join(dirname(d), n));
  const home = Deno.env.get("USERPROFILE") ?? Deno.env.get("HOME");
  if (home) candidates.push(join(home, "daedalus"));
  return candidates.find((c) => c && existsSync(join(c, "new-project.ts")));
}

const daedalus = findDaedalus();
if (!daedalus) {
  console.error("Daedalus checkout not found. Pass --daedalus <dir> or set DAEDALUS_HOME.");
  Deno.exit(1);
}
// `studio` runs the Daedalus design studio against this project; everything else goes to the generator.
const [cmd, ...rest] = args;
const invocation = cmd === "studio"
  ? ["task", "--cwd", join(daedalus, "studio"), "start", "--project", Deno.cwd(), ...rest]
  : ["run", "-A", join(daedalus, "new-project.ts"), cmd === "module" ? "add-module" : cmd === "pack" ? "add-pack" : "add-app", ...(cmd === "module" || cmd === "pack" ? rest : args), "--project", Deno.cwd()];
const r = new Deno.Command(Deno.execPath(), { args: invocation, stdout: "inherit", stderr: "inherit" }).outputSync();
Deno.exit(r.code);
