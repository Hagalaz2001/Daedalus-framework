import assert from "node:assert/strict";
import test from "node:test";
import { parseRouteMap, readShellMarker } from "../../shared/design/index.ts";
import { bridgeSrcDoc, parseBridgeMessage, selectorOfInstruction, trustedScriptSrcDoc } from "../src/design/designBridge.ts";

const MAP = {
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

test("route map: valid, and every rule rejects with a reason", () => {
  assert.equal(parseRouteMap(MAP).routes.length, 3);
  const bad = (patch: object, re: RegExp) => assert.throws(() => parseRouteMap({ ...MAP, ...patch }), re);
  bad({ appId: "Bad Name" }, /appId/);
  bad({ navArchetype: "drawer" }, /navArchetype/);
  bad({ routes: [] }, /1-40/);
  bad({ defaultRoute: "nope" }, /defaultRoute/);
  bad({ routes: [{ ...MAP.routes[0] }, { ...MAP.routes[0] }] }, /unique/);
  bad({ routes: [{ id: "a", path: "x", title: "A", slot: "primary", nav: { label: "A", order: 1 } }], defaultRoute: "a" }, /path/);
  bad({ routes: [{ id: "a", path: "/", title: "A", slot: "primary" }], defaultRoute: "a" }, /nav entry/);
  bad({ routes: [{ id: "a", path: "/", title: "A", slot: "sideways" }], defaultRoute: "a" }, /slot/);
});

test("shell marker is read from the first line only", () => {
  assert.deepEqual(readShellMarker("<!-- shell: clinic route: patients -->\n<p>x</p>"), { shellId: "clinic", route: "patients" });
  assert.equal(readShellMarker("<p>x</p><!-- shell: clinic route: patients -->"), null);
  assert.equal(readShellMarker("<!-- shell: ../x route: a -->"), null);
});

test("bridge messages: only the three exact shapes pass", () => {
  assert.deepEqual(parseBridgeMessage({ t: "ds-nav", route: "patients" }), { t: "nav", route: "patients" });
  assert.deepEqual(parseBridgeMessage({ t: "ds-ready" }), { t: "ready" });
  assert.deepEqual(parseBridgeMessage({ t: "ds-pick", selector: "#a > p:nth-of-type(2)", tag: "p", label: "Hello" }), {
    t: "pick",
    selector: "#a > p:nth-of-type(2)",
    tag: "p",
    label: "Hello",
  });
  for (
    const bad of [
      null,
      "x",
      [],
      { t: "ds-nav" },
      { t: "ds-nav", route: "../x" },
      { t: "ds-nav", route: "A B" },
      { t: "ds-pick", selector: "a{}", tag: "p", label: "" },
      { t: "ds-pick", selector: "x".repeat(401), tag: "p", label: "" },
      { t: "ds-pick", selector: "p", tag: "<script>", label: "" },
      { t: "other" },
    ]
  ) {
    assert.equal(parseBridgeMessage(bad), null, JSON.stringify(bad));
  }
});

test("bridge page: canonical head only, nonce CSP first, our script only, no network", () => {
  const html = "<!DOCTYPE html><html><head><title>x</title></head><body><p>hi</p></body></html>";
  const doc = bridgeSrcDoc(html, "abc123");
  assert.ok(doc.indexOf("Content-Security-Policy") < doc.indexOf("<title>"));
  assert.match(doc, /script-src 'nonce-abc123'/);
  assert.match(doc, /connect-src 'none'/);
  assert.equal((doc.match(/<script/g) ?? []).length, 1);
  // Anything that is not main's canonical serialisation is replaced, never patched with a regex.
  for (const tampered of ["<!-- <head> --><html><head></head><body></body></html>", "<p>no head</p>", "<html><head></head></html>"]) {
    const blocked = bridgeSrcDoc(tampered, "n");
    assert.ok(!blocked.includes("<script") && blocked.includes("default-src 'none'"), tampered);
  }
  assert.ok(trustedScriptSrcDoc(html).includes("script-src 'unsafe-inline'"));
  assert.ok(!trustedScriptSrcDoc("<p>x</p>").includes("unsafe-inline"));
});

test("a streamed write_designs call is read file by file from the partial tool input", async () => {
  const { readPartialDesigns } = await import("../../shared/design/toolInput.ts");
  const whole = JSON.stringify({
    files: [{ file: "v1.html", html: '<html><body><h1 class="a">Hi</h1></body></html>' }, { file: "v2.html", html: "<p>two</p>" }],
  });
  const cut = whole.slice(0, whole.indexOf("v2.html") + 20);
  const partial = readPartialDesigns(cut);
  assert.deepEqual(partial.map((f) => [f.file, f.closed]), [["v1.html", true], ["v2.html", false]]);
  assert.equal(partial[0]!.html, '<html><body><h1 class="a">Hi</h1></body></html>');
  assert.equal(readPartialDesigns('{"files":[{"file":"v1.html","html":"<p>par').at(0)?.html, "<p>par");
  assert.deepEqual(readPartialDesigns('{"files":[{"file":"../evil.html","html":"x"}]}'), []);
  assert.deepEqual(readPartialDesigns("{"), []);
});

test("selector from an instruction", () => {
  assert.equal(selectorOfInstruction('Change [#t] (h1 "Title"): bigger'), "#t");
  assert.equal(selectorOfInstruction("Make it bigger"), null);
});
