// deno-lint-ignore-file no-import-prefix
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSpecs, criteria, newPlan, newSpec, newTasks } from "./spec.ts";

function project() {
  const root = mkdtempSync(join(tmpdir(), "spec-"));
  cpSync(new URL("../../specs/templates", import.meta.url), join(root, "specs/templates"), { recursive: true });
  return root;
}
const edit = (root: string, f: string, fn: (s: string) => string) =>
  writeFileSync(join(root, f), fn(readFileSync(join(root, f), "utf8")));

Deno.test("spec lifecycle: new, plan, tasks, check", () => {
  const root = project();
  assertEquals(newSpec(root, "login"), "001-login");
  assertEquals(newSpec(root, "billing", "Billing page"), "002-billing");
  assertThrows(() => newSpec(root, "login"), Error, "already exists");
  assertThrows(() => newSpec(root, "Bad Slug"));

  edit(root, "specs/001-login/spec.md", (s) => s.replace("Status: draft | approved | implemented", "Status: approved"));
  assertThrows(() => newTasks(root, "login"), Error, "plan.md is missing");
  newPlan(root, "login");
  assertThrows(() => newPlan(root, "001"), Error, "already exists");
  assertThrows(() => newTasks(root, "login"), Error, 'no "- AC-n:"');

  edit(
    root,
    "specs/001-login/acceptance.md",
    (s) =>
      s.replace(/- AC-1: .*/, "- AC-1: Given a user, when they sign in, then they see home.").replace(
        /- AC-2: .*/,
        "- AC-2: Given a wrong password, when they sign in, then an error shows.",
      ),
  );
  assertEquals(criteria(root, "001-login").map((c) => c.id), ["AC-1", "AC-2"]);
  const out = newTasks(root, "login");
  const tasks = readFileSync(out, "utf8");
  assert(tasks.includes("T-1: test first, then implement AC-1"));
  assert(tasks.includes("T-2") && tasks.includes("AC-2"));
  assertEquals(checkSpecs(root), []);

  edit(root, "specs/001-login/tasks.md", (s) => s.replace("AC-2", "AC-x"));
  assertEquals(checkSpecs(root), ["001-login: AC-2 has no task"]);
});

Deno.test("plan refuses unresolved clarifications", () => {
  const root = project();
  newSpec(root, "x");
  edit(root, "specs/001-x/spec.md", (s) => s + "\n- R2: [NEEDS CLARIFICATION: which currency?]\n");
  assertThrows(() => newPlan(root, "x"), Error, "NEEDS CLARIFICATION");
});

Deno.test("check flags a plan on an unapproved spec", () => {
  const root = project();
  newSpec(root, "x");
  writeFileSync(join(root, "specs/001-x/plan.md"), "plan");
  assertEquals(checkSpecs(root), ["001-x: has a plan but the spec is not approved"]);
});
