import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { groupCommits, sectionOf, updateChangelog } from "./release-prepare.ts";
import { componentsFromLock } from "./sbom.ts";

Deno.test("groupCommits sorts conventional commits into sections and drops chores", () => {
  const g = groupCommits(["feat(cli): add upgrade", "fix: typo", "chore: bump", "feat!: new flags", "random message"]);
  assertEquals([...g.keys()], ["Breaking changes", "Added", "Fixed"]);
  assertEquals(g.get("Added"), ["- cli: add upgrade"]);
});

Deno.test("updateChangelog inserts a dated entry, or renames the hand-written unreleased one", () => {
  const base = "# Changelog\n\nintro\n\n## 1.0.0 (2026-01-01)\n\nold\n";
  const out = updateChangelog(base, "1.1.0", "2026-02-02", ["fix: a bug"]);
  assertStringIncludes(out, "## 1.1.0 (2026-02-02)\n\n### Fixed\n\n- a bug");
  assertEquals(out.indexOf("## 1.1.0") < out.indexOf("## 1.0.0"), true);
  assertEquals(
    updateChangelog("# C\n\n## 2.0.0 (unreleased)\n\nnotes\n", "2.0.0", "2026-03-03", []),
    "# C\n\n## 2.0.0 (2026-03-03)\n\nnotes\n",
  );
  assertEquals(sectionOf(out, "1.0.0"), "old");
});

Deno.test("componentsFromLock lists jsr and npm packages", () => {
  const lock = JSON.stringify({
    jsr: { "@std/path@1.0.0": {} },
    npm: { "zod@4.6.7": {}, "@scope/p@1.2.3_peer@1.0.0": {} },
  });
  const c = componentsFromLock(lock);
  assertEquals(c.map((x) => `${x.name}@${x.version}`).sort(), ["@scope/p@1.2.3", "@std/path@1.0.0", "zod@4.6.7"]);
});
