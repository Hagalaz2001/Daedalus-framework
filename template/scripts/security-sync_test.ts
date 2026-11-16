import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { join } from "node:path";
import { dependabotYaml, scan } from "./security-sync.ts";

Deno.test("scan finds manifests, skips build folders", () => {
  const root = Deno.makeTempDirSync();
  for (
    const f of [
      "deno.json",
      "backend/Dockerfile",
      "apps/mobile/pubspec.yaml",
      "apps/mobile/build/pubspec.yaml",
      "node_modules/x/package.json",
    ]
  ) {
    Deno.mkdirSync(join(root, f, ".."), { recursive: true });
    Deno.writeTextFileSync(join(root, f), "");
  }
  const found = scan(root);
  assertEquals(found.deno, ["/"]);
  assertEquals(found.docker, ["/backend"]);
  assertEquals(found.pub, ["/apps/mobile"]);
  assertEquals(found.cargo, []);
  Deno.removeSync(root, { recursive: true });
});

Deno.test("dependabot file has only the ecosystems that exist", () => {
  const yaml = dependabotYaml({ deno: ["/", "/backend"], docker: ["/backend"], pub: [], cargo: [] });
  assertStringIncludes(yaml, "package-ecosystem: github-actions");
  assertStringIncludes(yaml, "package-ecosystem: docker");
  assertStringIncludes(yaml, 'directories:\n      - "/"\n      - "/backend"');
  assertEquals(yaml.includes("pub"), false);
  assertEquals(yaml.includes("cargo"), false);
});
