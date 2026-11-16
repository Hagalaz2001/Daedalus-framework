import { assertEquals } from "jsr:@std/assert@1";
import { findNpmCommands, findUnpinned, FORBIDDEN_FILES } from "./lint-deno-only.ts";

const hit = (s: string) => findNpmCommands(s).length;

Deno.test("flags npm-family commands", () => {
  assertEquals(hit("run: npm ci"), 1); // deno-only:allow
  assertEquals(hit("  npx create-vite"), 1); // deno-only:allow
  assertEquals(hit("RUN pnpm install --frozen-lockfile"), 1); // deno-only:allow
  assertEquals(hit("use `yarn add left-pad` to"), 1); // deno-only:allow
});

Deno.test("allows Deno usage and prose", () => {
  assertEquals(hit("deno run -A npm:openapi-typescript@7.13.0 a b"), 0);
  assertEquals(hit('import x from "npm:hono@4"'), 0);
  assertEquals(hit("The npm registry hosts packages"), 0);
  assertEquals(hit("npm ci <!-- deno-only:allow -->"), 0);
});

Deno.test("flags lockfiles", () => {
  assertEquals(FORBIDDEN_FILES.some((r) => r.test("apps/web/package-lock.json")), true);
  assertEquals(FORBIDDEN_FILES.some((r) => r.test("deno.lock")), false);
});

Deno.test("framework versions must be exact", () => {
  const pkg = (deps: Record<string, string>) => JSON.stringify({ dependencies: deps });
  assertEquals(findUnpinned(pkg({ next: "^15.0.0", react: "19.2.1", hono: "~4.1.0", clsx: "^2.0.0" })), ["next@^15.0.0", "hono@~4.1.0"]);
  assertEquals(findUnpinned(pkg({ astro: "5.1.2", vue: "3.5.1", "better-auth": "workspace:*" })), []);
  assertEquals(findUnpinned("not json"), []);
});
