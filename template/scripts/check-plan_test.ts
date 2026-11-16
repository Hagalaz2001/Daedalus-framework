import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { appSteps, backendSteps } from "./check-plan.ts";

Deno.test("backend with a deno.json check task runs it", () => {
  assertEquals(backendSteps(true, JSON.stringify({ tasks: { check: "x" } }), null), [{ cwd: "backend", cmd: "deno task check" }]);
});

Deno.test("backend falls back to package.json scripts", () => {
  const steps = backendSteps(true, null, JSON.stringify({ scripts: { typecheck: "t", test: "t" } }));
  assertEquals(steps.map((s) => s.cmd), ["deno task typecheck", "deno task test"]);
});

Deno.test("a backend that would be skipped is an error, no backend is fine", () => {
  assertThrows(() => backendSteps(true, JSON.stringify({ tasks: { dev: "x" } }), null), Error, "skipped silently");
  assertThrows(() => backendSteps(true, null, null), Error, "skipped silently");
  assertEquals(backendSteps(false, null, null), []);
});

Deno.test("an app without check commands is an error", () => {
  assertEquals(appSteps([{ dir: "apps/web", check: [{ cwd: ".", run: "deno task check" }] }]).length, 1);
  assertThrows(() => appSteps([{ dir: "apps/web", check: [] }]), Error, "apps/web");
});
