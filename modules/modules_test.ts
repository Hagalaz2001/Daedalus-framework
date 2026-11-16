// Fast structural checks for every module (the slow end-to-end install is `deno run -A modules/verify.ts`).
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { parse } from "jsr:@std/yaml@1.3.0";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fromFileUrl } from "jsr:@std/path@1";
import { listModules } from "./verify.ts";

function* walk(dir: string): Generator<string> {
  for (const e of Deno.readDirSync(dir)) {
    const p = join(dir, e.name);
    if (e.isDirectory) yield* walk(p);
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) yield p;
  }
}

const here = fromFileUrl(new URL(".", import.meta.url));
const read = (...p: string[]) => JSON.parse(Deno.readTextFileSync(join(here, ...p)));

for (const name of listModules()) {
  Deno.test(`module ${name}: manifest, files, docs and licences are complete`, () => {
    const def = read(name, "module.json");
    assertEquals(def.name, name);
    assert(["full", "thin"].includes(def.status), "status is full or thin");
    assert(def.summary?.length > 20, "has a summary");
    assert(existsSync(join(here, name, "THIRD_PARTY.md")), "THIRD_PARTY.md");
    assert(existsSync(join(here, name, def.files ?? "files", def.docs)), `doc ${def.docs}`);
    const code = join(here, name, "files", "backend", "src", "modules", name);
    for (const f of ["mod.ts", "setup.json"]) assert(existsSync(join(code, f)), f);
    assert(existsSync(join(code, "tests")), "has tests");
    assertEquals(def.install[0].run, `deno task --cwd backend modules:apply ${name}`);

    // A module whose code uses Drizzle or SQL cannot run on the MongoDB flavour and must say so.
    const sqlOnly = [...walk(code)].some((p) => /drizzle-orm|pg-boss|pg-core/.test(Deno.readTextFileSync(p)));
    assertEquals(
      def.requires?.db === "postgres",
      sqlOnly,
      "requires.db must be postgres exactly when the code uses SQL",
    );

    const setup = read(name, "files", "backend", "src", "modules", name, "setup.json");
    if (setup.contract) assert(parse(Deno.readTextFileSync(join(code, setup.contract))), "contract fragment parses");
    for (const spec of Object.values<string>(setup.deno?.imports ?? {})) {
      assert(!/[\^~*]|latest/.test(spec), `${spec} must be an exact version`);
    }
  });
}
