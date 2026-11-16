import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import {
  addToManifest,
  type AppEntry,
  applyOverlay,
  applyReplacements,
  defaultOverlays,
  composeStack,
  isAppDir,
  mergeSettings,
  isBundleId,
  isDisplayName,
  type Manifest,
  mergeDenoJson,
  moveDir,
  stacksFromFlags,
  subst,
  varsFor,
} from "./blueprint.ts";

const entry = (dir: string): AppEntry => ({ stack: "s", kind: "web", dir, name: "n", check: [], sync: [] });

Deno.test("validation: bundle id, app dir, display name", () => {
  assert(isBundleId("com.acme.shop"));
  assert(!isBundleId("Com.Acme"));
  assert(!isBundleId("shop"));
  assert(!isBundleId("com.acme.shop; rm -rf /"));
  assert(isAppDir("apps/admin-web"));
  assert(!isAppDir("apps/../x"));
  assert(!isAppDir("packages/x"));
  assert(isDisplayName("Acme Notes"));
  assert(!isDisplayName("Bob's <App>"));
});

Deno.test("flags map to stack ids and reject unknown values", () => {
  assertEquals(stacksFromFlags({ web: "spa,site,spa-vue,site-next", mobile: "rn", desktop: "tauri" }), ["web-spa", "web-site-astro", "web-spa-vue", "web-site-next", "mobile-rn", "desktop-tauri"]);
  assertEquals(stacksFromFlags({ web: "none", mobile: "none" }), []);
  assertThrows(() => stacksFromFlags({ web: "vue" }));
  assertThrows(() => stacksFromFlags({ mobile: "swift" }));
  assertThrows(() => stacksFromFlags({ desktop: "electron" }));
});

Deno.test("placeholders", () => {
  const v = varsFor({ appDir: "apps/staff-app", displayName: "Staff", bundleId: "com.acme.staff" });
  assertEquals(v.appName, "staff_app");
  assertEquals(v.bundlePath, "com/acme/staff");
  assertEquals(subst("{bundleId}/{unknown}", v), "com.acme.staff/{unknown}");
});

Deno.test("replacements and directory moves in an app copy", () => {
  const dir = Deno.makeTempDirSync();
  try {
    Deno.mkdirSync(join(dir, "android/kotlin/com/example/mobile"), { recursive: true });
    Deno.writeTextFileSync(join(dir, "pubspec.yaml"), "name: mobile\nid: com.example.mobile\n");
    Deno.writeTextFileSync(join(dir, "android/kotlin/com/example/mobile/Main.kt"), "package com.example.mobile\n");
    const v = varsFor({ appDir: "apps/shop", bundleId: "org.acme.shop" });
    applyReplacements(dir, [
      { from: "com.example.mobile", to: "{bundleId}" },
      { files: ["pubspec.yaml"], from: "^name: mobile$", to: "name: {appName}", regex: true },
    ], v);
    moveDir(dir, "android/kotlin/com/example/mobile", "android/kotlin/org/acme/shop");
    assertEquals(Deno.readTextFileSync(join(dir, "pubspec.yaml")), "name: shop\nid: org.acme.shop\n");
    assertEquals(Deno.readTextFileSync(join(dir, "android/kotlin/org/acme/shop/Main.kt")), "package org.acme.shop\n");
    assertEquals(Array.from(Deno.readDirSync(join(dir, "android/kotlin"))).map((e) => e.name), ["org"]);
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("deno.json merge: workspace members, task name conflicts", () => {
  const base = { workspace: ["./backend"], tasks: { sync: "x", "dev:web": "deno task --cwd apps/web dev" } };
  const a = mergeDenoJson(base, { tasks: { "dev:web": "deno task --cwd apps/web dev" }, workspace: ["./apps/web"] }, "web");
  assertEquals(a.workspace, ["./backend", "./apps/web"]);
  assertEquals(Object.keys(a.tasks!), ["sync", "dev:web"]); // identical task is not duplicated
  const b = mergeDenoJson(a, { tasks: { "dev:web": "deno task --cwd apps/admin dev" }, workspace: ["./apps/admin"] }, "admin");
  assertEquals(b.tasks!["dev:web:admin"], "deno task --cwd apps/admin dev");
  assertEquals(b.tasks!["dev:web"], "deno task --cwd apps/web dev");
  assertEquals(base.workspace, ["./backend"]); // input untouched
});

Deno.test("manifest rejects a duplicate app dir", () => {
  const m: Manifest = { version: 2, name: "p", backend: true, apps: [entry("apps/web")] };
  assertEquals(addToManifest(m, entry("apps/admin")).apps.length, 2);
  assertThrows(() => addToManifest(m, entry("apps/web")));
});

Deno.test("composeStack copies the app and package once, resolves commands", () => {
  const bp = Deno.makeTempDirSync();
  const project = Deno.makeTempDirSync();
  try {
    const stackDir = join(bp, "stacks/demo");
    Deno.mkdirSync(join(stackDir, "app/src"), { recursive: true });
    Deno.mkdirSync(join(stackDir, "packages/kit"), { recursive: true });
    Deno.writeTextFileSync(join(stackDir, "app/src/main.ts"), "// {nothing}\nconst id = 'com.example.mobile';\n");
    Deno.writeTextFileSync(join(stackDir, "packages/kit/a.ts"), "export {};\n");
    Deno.writeTextFileSync(join(stackDir, "packages/kit/package.json"), "{}");
    const stack = {
      id: "demo", kind: "mobile" as const, defaultAppDir: "apps/mobile", workspaceMember: true,
      packages: ["stack:packages/kit"], root: stackDir,
      replace: [{ from: "com.example.mobile", to: "{bundleId}" }],
      tasks: { "dev:mobile": { cwd: "{appDir}", run: "start" } },
      check: [{ cwd: "{appDir}", run: "test {appName}" }],
    };
    const r = composeStack({ projectDir: project, blueprintDir: bp, stack, appDir: "apps/shop", bundleId: "org.acme.shop" });
    assertEquals(Deno.readTextFileSync(join(project, "apps/shop/src/main.ts")).includes("org.acme.shop"), true);
    assertEquals(r.entry.check, [{ cwd: "apps/shop", run: "test shop" }]);
    assertEquals(r.tasks["dev:mobile"], "cd apps/shop && start");
    assertEquals(r.workspace, ["./packages/kit", "./apps/shop"]);
    composeStack({ projectDir: project, blueprintDir: bp, stack, appDir: "apps/two" });
    assertThrows(() => composeStack({ projectDir: project, blueprintDir: bp, stack, appDir: "apps/two" }));
    assertThrows(() => composeStack({ projectDir: project, blueprintDir: bp, stack, appDir: "../evil" }));
  } finally {
    Deno.removeSync(bp, { recursive: true });
    Deno.removeSync(project, { recursive: true });
  }
});

Deno.test("overlay: copies files, merges tasks, refuses overwrite and missing backend", () => {
  const bp = Deno.makeTempDirSync();
  const project = Deno.makeTempDirSync();
  try {
    const dir = join(bp, "modules/billing");
    Deno.mkdirSync(join(dir, "files/backend/src"), { recursive: true });
    Deno.writeTextFileSync(join(dir, "files/backend/src/billing.ts"), "export {};");
    Deno.writeTextFileSync(join(dir, "module.json"), JSON.stringify({ requires: { backend: true }, tasks: { "billing:seed": "deno run x.ts" }, check: ["deno test"] }));
    const manifest = { version: 2 as const, name: "p", backend: true, apps: [] };
    const r = applyOverlay({ blueprintDir: bp, projectDir: project, kind: "module", name: "billing", manifest });
    assertEquals(r.tasks, { "billing:seed": "deno run x.ts" });
    assertEquals(r.extra.check, [{ cwd: ".", run: "deno test" }]);
    assert(Deno.statSync(join(project, "backend/src/billing.ts")).isFile);
    assertThrows(() => applyOverlay({ blueprintDir: bp, projectDir: project, kind: "module", name: "billing", manifest }), Error, "overwrite");
    assertThrows(() => applyOverlay({ blueprintDir: bp, projectDir: project, kind: "module", name: "billing", manifest: { ...manifest, backend: false } }), Error, "backend");
    assertThrows(() => applyOverlay({ blueprintDir: bp, projectDir: project, kind: "module", name: "nope", manifest }), Error, "Unknown");
  } finally {
    Deno.removeSync(bp, { recursive: true });
    Deno.removeSync(project, { recursive: true });
  }
});

Deno.test("settings merge: hooks concatenate without duplicates, own keys win", () => {
  const a = { model: "x", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ command: "a" }] }] } };
  const b = { model: "y", extra: 1, hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ command: "a" }] }, { matcher: "Write", hooks: [{ command: "b" }] }], Stop: [{ hooks: [{ command: "c" }] }] } };
  const m = mergeSettings(a, b) as { model: string; extra: number; hooks: Record<string, unknown[]> };
  assertEquals([m.model, m.extra], ["x", 1]);
  assertEquals(m.hooks.PreToolUse.length, 2);
  assertEquals(m.hooks.Stop.length, 1);
});

Deno.test("overlay: rules are appended to AGENTS.md and settings.json is merged", () => {
  const bp = Deno.makeTempDirSync();
  const project = Deno.makeTempDirSync();
  try {
    const dir = join(bp, "packs/safety");
    Deno.mkdirSync(join(dir, "files/.claude"), { recursive: true });
    Deno.writeTextFileSync(join(dir, "rules.md"), "Never ship unreviewed.\n");
    Deno.writeTextFileSync(join(dir, "pack.json"), JSON.stringify({ rules: "rules.md", default: true }));
    Deno.writeTextFileSync(join(dir, "files/.claude/settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ command: "b" }] }] } }));
    Deno.mkdirSync(join(project, ".claude"), { recursive: true });
    Deno.writeTextFileSync(join(project, ".claude/settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ command: "a" }] }] } }));
    Deno.writeTextFileSync(join(project, "AGENTS.md"), "# Rules\n");
    applyOverlay({ blueprintDir: bp, projectDir: project, kind: "pack", name: "safety", manifest: { version: 2, name: "p", backend: false, apps: [] } });
    assert(Deno.readTextFileSync(join(project, "AGENTS.md")).includes("## Pack: safety\n\nNever ship unreviewed."));
    assertEquals(JSON.parse(Deno.readTextFileSync(join(project, ".claude/settings.json"))).hooks.Stop.length, 2);
    assertEquals(defaultOverlays(bp, "pack"), ["safety"]);
  } finally {
    Deno.removeSync(bp, { recursive: true });
    Deno.removeSync(project, { recursive: true });
  }
});
