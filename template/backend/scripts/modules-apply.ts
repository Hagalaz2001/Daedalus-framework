// `deno task modules:apply <id>...` finishes installing modules whose folders are already in src/modules/<id>/
// (the generator copies them; this script does the parts a file copy cannot):
//   deno imports  -> backend/deno.json        env vars -> backend/.env.example
//   contract      -> contracts/openapi.yaml   ui-templates/<stack> -> each app of that stack
//   then `deno install`, Better Auth schema, a Drizzle migration and the ERD, as the module's setup.json asks.
// Safe to run twice. The setup.json format is documented in docs/MODULES.md.
import { parse, stringify } from "@std/yaml";
import { copy } from "@std/fs/copy";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runArgs } from "../../scripts/lib/exec.ts";
import { OPENAPI_TYPESCRIPT } from "../../scripts/versions.ts";

type Json = Record<string, unknown>;
interface Setup {
  deno?: { imports?: Record<string, string>; compilerOptions?: Json };
  env?: { name: string; example?: string; description: string }[];
  contract?: string;
  database?: { authSchema?: boolean; migration?: boolean };
  ui?: Record<string, { from: string; to: string }[]>;
}

const backend = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const root = join(backend, "..");
const read = async (f: string) => await Deno.readTextFile(f);
const exists = (f: string) => Deno.stat(f).then(() => true, () => false);

function run(args: string[], cwd: string) {
  console.log(`> [${cwd === root ? "." : "backend"}] deno ${args.join(" ")}`);
  if (!runArgs(Deno.execPath(), args, { cwd }).ok) throw new Error(`failed: deno ${args.join(" ")}`);
}

/** Adds what `extra` has and `base` lacks; keeps existing values (a module never overrides project settings). */
function fill(base: Json, extra: Json): Json {
  for (const [k, v] of Object.entries(extra)) {
    const cur = base[k];
    if (cur === undefined) base[k] = v;
    else if (typeof cur === "object" && typeof v === "object" && !Array.isArray(cur)) fill(cur as Json, v as Json);
  }
  return base;
}

async function mergeContract(fragmentFile: string) {
  const target = join(root, "contracts", "openapi.yaml");
  const doc = parse(await read(target)) as Json;
  const fragment = parse(await read(fragmentFile)) as Json;
  for (const section of ["paths", "components", "tags"]) {
    const add = fragment[section];
    if (add === undefined) continue;
    if (Array.isArray(add)) {
      const tags = (doc[section] ?? []) as { name: string }[];
      doc[section] = [...tags, ...(add as { name: string }[]).filter((t) => !tags.some((x) => x.name === t.name))];
    } else {
      doc[section] = fill((doc[section] ?? {}) as Json, add as Json);
    }
  }
  await Deno.writeTextFile(target, stringify(doc, { lineWidth: 120 }));
}

async function placeUi(id: string, ui: NonNullable<Setup["ui"]>) {
  const manifest = JSON.parse(await read(join(root, ".blueprint.json"))) as { apps: { stack: string; dir: string }[] };
  for (const app of manifest.apps) {
    for (const f of ui[app.stack] ?? []) {
      const to = join(root, app.dir, f.to);
      if (await exists(to)) console.log(`  ${to} exists, left alone`);
      else await copy(join(backend, "src", "modules", id, f.from), to);
    }
  }
}

const ids = Deno.args;
if (!ids.length) {
  console.error("usage: deno task modules:apply <module-id>...");
  Deno.exit(1);
}
let authSchema = false;
let migration = false;
for (const id of ids) {
  const dir = join(backend, "src", "modules", id);
  const setupFile = join(dir, "setup.json");
  if (!await exists(setupFile)) throw new Error(`src/modules/${id}/setup.json not found: copy the module first`);
  const setup = JSON.parse(await read(setupFile)) as Setup;
  console.log(`Applying module ${id}`);

  if (setup.deno) {
    const file = join(backend, "deno.json");
    await Deno.writeTextFile(
      file,
      JSON.stringify(fill(JSON.parse(await read(file)), setup.deno as Json), null, 2) + "\n",
    );
  }
  if (setup.env?.length) {
    const file = join(backend, ".env.example");
    const current = await read(file);
    const missing = setup.env.filter((e) => !new RegExp(`^${e.name}=`, "m").test(current));
    if (missing.length) {
      const block = missing.map((e) => `# ${e.description}\n${e.name}=${e.example ?? ""}`).join("\n");
      await Deno.writeTextFile(file, `${current.trimEnd()}\n\n# module: ${id}\n${block}\n`);
    }
  }
  if (setup.contract) await mergeContract(join(dir, setup.contract));
  if (setup.ui) await placeUi(id, setup.ui);
  await Deno.remove(join(dir, "ui-templates"), { recursive: true }).catch(() => {});
  authSchema ||= !!setup.database?.authSchema;
  migration ||= !!setup.database?.migration;
}

// Every module folder is already copied when the first one is applied (the generator copies them all, then applies
// one by one), and the auth-schema step below loads all of them. So make the imports of the others resolvable too;
// each module's own apply later finds them in place and skips them.
for await (const e of Deno.readDir(join(backend, "src", "modules"))) {
  if (!e.isDirectory || ids.includes(e.name)) continue;
  const f = join(backend, "src", "modules", e.name, "setup.json");
  if (!await exists(f)) continue;
  const other = JSON.parse(await read(f)) as Setup;
  if (other.deno) {
    const file = join(backend, "deno.json");
    await Deno.writeTextFile(
      file,
      JSON.stringify(fill(JSON.parse(await read(file)), other.deno as Json), null, 2) + "\n",
    );
  }
}

// The MongoDB flavour has no Drizzle tasks: its schema lives in src/shared/db/models.ts and migrations/.
const sql = "db:generate" in (JSON.parse(await read(join(backend, "deno.json"))).tasks ?? {});
run(["install"], root);
// Modules add types to the contract; regenerate the TypeScript client now so the backend compiles. (`deno task sync`
// does this too and also refreshes the other stacks' clients.)
if (
  ids.length && await exists(join(root, "contracts", "openapi.yaml")) && await exists(join(root, "packages", "api_ts"))
) {
  run([
    "run",
    "-A",
    "--no-config",
    "--no-lock",
    `npm:openapi-typescript@${OPENAPI_TYPESCRIPT}`,
    "contracts/openapi.yaml",
    "-o",
    "packages/api_ts/src/schema.d.ts",
  ], root);
}
if (authSchema && sql) run(["task", "db:auth-schema"], backend);
if (migration && sql) {
  run(["task", "db:generate", "--name", `add_${ids.join("_").replaceAll("-", "_")}`], backend);
  run(["task", "diagrams"], backend);
}
run(["fmt", "deno.json", "../contracts/openapi.yaml"], backend);
console.log("Done. Run `deno task sync` to regenerate the API clients, then `deno task check`.");
