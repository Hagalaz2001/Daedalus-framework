import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseRouteMap } from "../../../shared/design/index.ts";
import { composeScreen } from "../projectDesignShells.ts";
import { beginStep, listDesigns, readDesign, screenDir } from "../projectDesignStore.ts";

const SHELL =
  "<!doctype html><html><head><style>:root{--bg:#fff}</style></head><body><nav data-nav></nav><main data-outlet></main></body></html>";
const MAP = {
  appId: "app",
  defaultRoute: "home",
  navArchetype: "bottomTabs",
  routes: [
    { id: "home", path: "/", title: "Home", slot: "primary", nav: { label: "Home", order: 1 } },
    { id: "plans", path: "/plans", title: "Plans", slot: "primary", nav: { label: "Plans", order: 2 } },
  ],
};

describe("shell composition in the design store", () => {
  it("lists shells, composes bodies on read, and exposes route and shell per file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "design-shell-"));
    mkdirSync(join(dir, "design", "shell"), { recursive: true });
    writeFileSync(join(dir, "design", "shell", "app.html"), SHELL);
    writeFileSync(join(dir, "design", "shell", "app.routes.json"), JSON.stringify(MAP));
    const { slug } = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "Home",
      brief: "Home",
      target: "web-mobile",
      count: 1,
    });
    writeFileSync(join(screenDir(dir, slug), "v1.html"), "<!-- shell: app route: home -->\n<section>Welcome</section>");
    const list = await listDesigns(dir);
    assert.deepEqual(list.shells.map((s) => s.id), ["app"]);
    const file = list.screens[0]!.files[0]!;
    assert.deepEqual([file.ok, file.shellId, file.route], [true, "app", "home"]);
    const html = await readDesign(dir, slug, "v1.html");
    assert.ok(
      html.includes("<section>Welcome</section>") && html.includes('aria-current="page"') && html.includes(">Plans<"),
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("a screen whose shell is missing or broken is blocked with the reason, never previewed half-built", async () => {
    const dir = mkdtempSync(join(tmpdir(), "design-shell-bad-"));
    const { slug } = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "Home",
      brief: "Home",
      target: "web-mobile",
      count: 1,
    });
    writeFileSync(join(screenDir(dir, slug), "v1.html"), "<!-- shell: app route: home -->\n<section>x</section>");
    const file = (await listDesigns(dir)).screens[0]!.files[0]!;
    assert.equal(file.ok, false);
    assert.match(file.problems.join(" "), /Shell "app" cannot be used/);
    await assert.rejects(readDesign(dir, slug, "v1.html"), /cannot be used/);
    mkdirSync(join(dir, "design", "shell"), { recursive: true });
    writeFileSync(join(dir, "design", "shell", "app.html"), SHELL);
    writeFileSync(join(dir, "design", "shell", "app.routes.json"), JSON.stringify({ ...MAP, defaultRoute: "nope" }));
    await assert.rejects(readDesign(dir, slug, "v1.html"), /defaultRoute/);
    rmSync(dir, { recursive: true, force: true });
  });
});

const CLINIC = {
  appId: "clinic",
  defaultRoute: "today",
  navArchetype: "bottomTabs",
  routes: [
    { id: "today", path: "/", title: "Today", slot: "primary", nav: { label: "Today", order: 1 } },
    {
      id: "patients",
      path: "/patients",
      title: "Patients",
      slot: "primary",
      nav: { label: "Patients", order: 2, badge: { kind: "count", value: 3 } },
    },
    {
      id: "patient-detail",
      path: "/patients/:id",
      title: "Patient",
      slot: "detail",
      header: { show: true, back: true },
      layout: { hideNav: true },
    },
  ],
};
const CHROME =
  "<!doctype html><html><head><style>:root{--bg:#fff}</style></head><body><header><button data-back>Back</button><h1 data-title>x</h1></header><nav data-nav></nav><main data-outlet>old</main></body></html>";

describe("composition (parsed, not regex)", () => {
  it("composing: outlet, generated nav with aria-current, title, back, route attributes", () => {
    const map = parseRouteMap(CLINIC);
    const body = "<!-- shell: clinic route: patients -->\n<section>List</section>";
    const out = composeScreen(CHROME, body, map, "patients");
    assert.match(out, /<main data-outlet="">\n<section>List<\/section><\/main>/);
    assert.match(
      out,
      /<a href="#today" data-route="today" class="nav-item">Today<\/a><a href="#patients" data-route="patients" class="nav-item" aria-current="page">Patients<span class="nav-badge" data-kind="count">3<\/span><\/a>/,
    );
    assert.match(out, /data-title="">Patients<\/h1>/);
    assert.match(out, /data-back="" hidden="">/);
    assert.match(out, /<body data-route="patients" data-slot="primary">/);
    const detail = composeScreen(CHROME, "<p>d</p>", map, "patient-detail");
    assert.ok(!/data-back[^>]*hidden/.test(detail) && /data-hide-nav/.test(detail));
    assert.throws(() => composeScreen(CHROME, body, map, "missing"), /no route/);
  });

  it("renaming a tab edits the route map once and every screen reflects it", () => {
    const renamed = parseRouteMap({
      ...CLINIC,
      routes: CLINIC.routes.map((r) => (r.id === "patients" ? { ...r, nav: { ...r.nav!, label: "People" } } : r)),
    });
    for (const route of ["today", "patients"]) {
      const out = composeScreen(CHROME, "<p>x</p>", renamed, route);
      assert.ok(out.includes(">People<") && !out.includes(">Patients<span"));
    }
  });

  it("labels are escaped", () => {
    const map = parseRouteMap({
      ...CLINIC,
      routes: [{ id: "a", path: "/", title: "<b>A</b>", slot: "primary", nav: { label: "<img onerror=x>", order: 1 } }],
      defaultRoute: "a",
    });
    const out = composeScreen(CHROME, "<p>x</p>", map, "a");
    assert.ok(!out.includes("<img onerror") && out.includes("&lt;img onerror=x&gt;"));
  });
});
