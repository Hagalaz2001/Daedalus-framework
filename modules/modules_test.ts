// Fast structural checks for every module (the slow end-to-end install is `deno run -A modules/verify.ts`).
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { parse } from "jsr:@std/yaml@1.3.0";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listModules } from "./verify.ts";

const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
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

    const setup = read(name, "files", "backend", "src", "modules", name, "setup.json");
    if (setup.contract) assert(parse(Deno.readTextFileSync(join(code, setup.contract))), "contract fragment parses");
    for (const spec of Object.values<string>(setup.deno?.imports ?? {})) {
      assert(!/[\^~*]|latest/.test(spec), `${spec} must be an exact version`);
    }
  });
}
