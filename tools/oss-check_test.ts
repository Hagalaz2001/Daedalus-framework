// Generated output must pass the same scan as the repo: a leaked local path or build file in a new project fails here
// even when the checked-in files are clean (the repo scan only sees git-visible files).
import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { composeStack, copyTree, listStacks, loadStack } from "../lib/blueprint.ts";
import { listFiles } from "../template/scripts/lint-deno-only.ts";
import { root, scanContent } from "./oss-check.ts";

Deno.test("scanContent flags a personal path and a private email", () => {
  const dir = Deno.makeTempDirSync();
  // Assembled from parts so this file does not trip the repo scan itself.
  Deno.writeTextFileSync(join(dir, "a.xcconfig"), "FLUTTER_ROOT=" + "C:" + "\\Users\\someone\\flutter");
  Deno.writeTextFileSync(join(dir, "b.md"), "mail me: someone" + "@private-corp.io");
  assertEquals(scanContent(dir, ["a.xcconfig", "b.md"]).length, 2);
});

Deno.test("every stack, generated into a project, passes the oss scan and carries no build leftovers", () => {
  const dir = Deno.makeTempDirSync();
  copyTree(join(root, "template"), dir);
  for (const id of listStacks(root)) {
    composeStack({
      projectDir: dir,
      blueprintDir: root,
      stack: loadStack(root, id),
      appDir: `apps/${id}`,
      displayName: "Acme Notes",
      bundleId: "com.example.acme",
    });
  }
  const files = listFiles(dir);
  assertEquals(scanContent(dir, files), []);
  const leftovers = files.filter((f) =>
    /(^|\/)(Generated\.xcconfig|flutter_export_environment\.sh|\.dart_tool|node_modules|target|build)(\/|$)/.test(f)
  );
  assertEquals(leftovers, []);
});
