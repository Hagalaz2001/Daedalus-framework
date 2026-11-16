import { assertEquals } from "jsr:@std/assert@1";
import { levelFor, nextVersion, notesFor, parseCommit, updateChangelog } from "./release.ts";

Deno.test("parseCommit reads type, subject and breaking marks", () => {
  assertEquals(parseCommit("feat(api): add notes"), { type: "feat", subject: "add notes", breaking: false });
  assertEquals(parseCommit("fix!: drop old route")?.breaking, true);
  assertEquals(parseCommit("chore: x\n\nBREAKING CHANGE: y")?.breaking, true);
  assertEquals(parseCommit("Merge branch main"), null);
});

Deno.test("levelFor picks the biggest change; chores alone release nothing", () => {
  const c = (m: string) => parseCommit(m)!;
  assertEquals(levelFor([c("fix: a"), c("feat: b")]), "minor");
  assertEquals(levelFor([c("fix: a"), c("feat!: b")]), "major");
  assertEquals(levelFor([c("fix: a")]), "patch");
  assertEquals(levelFor([c("chore: a"), c("docs: b")]), null);
});

Deno.test("nextVersion bumps; before 1.0.0 breaking is a minor bump", () => {
  assertEquals(nextVersion("v1.2.3", "patch"), "v1.2.4");
  assertEquals(nextVersion("v1.2.3", "minor"), "v1.3.0");
  assertEquals(nextVersion("v1.2.3", "major"), "v2.0.0");
  assertEquals(nextVersion("v0.4.1", "major"), "v0.5.0");
  assertEquals(nextVersion("v0.0.0", "minor"), "v0.1.0");
});

Deno.test("changelog keeps manual notes and notesFor finds them again", () => {
  const before = "# Changelog\n\nIntro.\n\n## Unreleased\n\nHand-written note.\n\n## v1.0.0 - 2026-01-01\n\n- old\n";
  const after = updateChangelog(before, "v1.1.0", "2026-02-02", [parseCommit("feat: shiny")!]);
  assertEquals(notesFor(after, "v1.1.0"), "### Features\n- shiny\n\nHand-written note.");
  assertEquals(notesFor(after, "v1.0.0"), "- old");
  assertEquals(after.includes("## Unreleased\n\n## v1.1.0 - 2026-02-02"), true);
});
