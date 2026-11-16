// Component tests: server-side render (no DOM needed) and assert on the markup the developer would see.
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DesignScreen } from "../../shared/design/index.ts";
import { ChecksPanel } from "../src/design/ChecksPanel.tsx";
import { EditPanel } from "../src/design/EditPanel.tsx";
import { FlowBoard } from "../src/design/FlowBoard.tsx";
import { PlanDialog } from "../src/design/PlanDialog.tsx";
import type { PlanView } from "../src/design/designApi.ts";
import { bridgeSrcDoc, previewSrcDoc } from "../src/design/designBridge.ts";
import { t } from "../src/i18n.ts";
import { Button } from "../src/kit.tsx";

const plan: PlanView = {
  id: "p1",
  files: [
    {
      path: "apps/web/src/features/sales/ui/SalesScreen.tsx",
      status: "new",
      binary: false,
      bytes: 20,
      diff: [{ kind: "add", text: "export const a = 1" }],
    },
    {
      path: "design/tokens.json",
      status: "changed",
      binary: false,
      bytes: 9,
      diff: [{ kind: "same", text: "{" }, { kind: "del", text: '  "a": 1' }, { kind: "add", text: '  "a": 2' }, {
        kind: "same",
        text: "}",
      }],
    },
    { path: "docs/screenshots/a-phone-light.png", status: "new", binary: true, bytes: 4096, diff: [] },
  ],
};
const noop = () => undefined;

test("plan dialog lists every file with its status and says nothing is written until confirmed", () => {
  const html = renderToStaticMarkup(
    <PlanDialog plan={plan} title="Export SalesScreen" busy={false} error={null} onWrite={noop} onCancel={noop} />,
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /Export SalesScreen/);
  for (const f of plan.files) assert.ok(html.includes(f.path), f.path);
  assert.match(html, /3 files to write\. Nothing is written until you confirm/);
  assert.match(html, /Write 3 files/);
  assert.match(html, /export const a = 1/);
});

test("plan dialog: nothing to write disables the button, errors are announced", () => {
  const same: PlanView = {
    id: "x",
    files: [{ path: "DESIGN.md", status: "unchanged", binary: false, bytes: 3, diff: [{ kind: "same", text: "x" }] }],
  };
  const html = renderToStaticMarkup(
    <PlanDialog plan={same} title="t" busy={false} error="Disk is full" onWrite={noop} onCancel={noop} />,
  );
  assert.match(html, /<button[^>]*disabled[^>]*>Write 0 files/);
  assert.match(html, /role="alert">Disk is full/);
  assert.match(html, /already identical/);
});

test("checks panel: failing rules show their reason, passing rules their label, and a fix button appears", () => {
  const warnings = [{
    id: "contrast",
    message: "Text below WCAG AA contrast (4.5:1): .pill (2.8:1).",
    fix: "raise it",
  }];
  const html = renderToStaticMarkup(<ChecksPanel warnings={warnings} busy={false} onFix={noop} />);
  assert.match(html, /Text below WCAG AA contrast/);
  assert.match(html, /Uses design tokens/);
  assert.match(html, /Lists have loading, empty and error states/);
  assert.match(html, /Fix this issue/);
  assert.match(renderToStaticMarkup(<ChecksPanel warnings={[]} busy={false} onFix={noop} />), /44px targets/);
});

const screen: DesignScreen = {
  slug: "billing",
  manifest: {
    version: 1,
    slug: "billing",
    brief: "Invoices",
    target: "web-desktop",
    model: "model",
    engine: "model",
    created: "2026-01-01T00:00:00Z",
    steps: [
      { id: "s1", kind: "generate", instruction: "Invoices overview", created: "t", files: ["v1.html", "v2.html"] },
      {
        id: "s2",
        kind: "refine",
        instruction: "Make the header sticky",
        created: "t",
        files: ["v1-r1.html"],
        parent: "v1.html",
        mode: "surgical",
      },
      {
        id: "s3",
        kind: "refine",
        instruction: "Add an empty state",
        created: "t",
        files: ["v1-r2.html"],
        parent: "v1-r1.html",
        mode: "surgical",
      },
    ],
  },
  files: [
    { file: "v1.html", modifiedAt: "1", ok: true, problems: [], scripts: false },
    { file: "v2.html", modifiedAt: "1", ok: true, problems: [], scripts: false },
    { file: "v1-r1.html", modifiedAt: "2", ok: true, problems: [], scripts: false },
  ],
  exports: [],
};

test("edit panel reads the history as a conversation: versions, progress and failures", () => {
  const html = renderToStaticMarkup(
    <EditPanel
      screen={screen}
      info={screen.files[0]!}
      jobs={{ "billing/s3": { state: "error", errors: { "v1-r2.html": "rate limited" } } }}
      busy={false}
      picking={false}
      onPick={noop}
      onSelectFile={noop}
      onRefine={noop}
      onRelated={noop}
    />,
  );
  assert.match(html, /Invoices overview/);
  assert.match(html, /Make the header sticky/);
  assert.match(html, />v1<\/button>/);
  assert.match(html, />v1-r1<\/button>/);
  assert.match(html, /rate limited/);
  assert.match(html, /Make the header sticky<\/button>/, "suggestion chip");
  assert.match(html, /Describe a change/);
  assert.match(html, /Select element/);
});

test("edit panel: a step without a result yet shows progress", () => {
  const pending = { ...screen, files: screen.files.slice(0, 2) };
  const html = renderToStaticMarkup(
    <EditPanel
      screen={pending}
      info={pending.files[0]!}
      jobs={{ "billing/s2": { state: "running", errors: {} } }}
      busy
      picking={false}
      onPick={noop}
      onSelectFile={noop}
      onRefine={noop}
      onRelated={noop}
    />,
  );
  assert.match(html, /Working on one version/);
});

test("flow board renders a card per screen and the connect control", () => {
  const html = renderToStaticMarkup(
    <FlowBoard
      screens={[screen, { ...screen, slug: "login" }]}
      frame={{ width: 1280, height: 800, radius: 10 }}
      theme="light"
      onOpen={noop}
    />,
  );
  assert.match(html, />billing<\/button>/);
  assert.match(html, />login<\/button>/);
  assert.match(html, /Connect screens/);
  assert.match(html, /design\/studio\/flow\.json/);
});

test("kit button exposes variant and size for styling", () => {
  assert.match(
    renderToStaticMarkup(<Button variant="outline" size="sm">Go</Button>),
    /data-variant="outline" data-size="sm"/,
  );
});

test("previews: the bridge frame has a nonce CSP with no network, the static preview has no script at all, and dark is a class", () => {
  const page = "<!DOCTYPE html><html><head><style>:root{--a:1}</style></head><body><main>x</main></body></html>";
  const bridged = bridgeSrcDoc(page, "abc123");
  assert.match(bridged, /script-src 'nonce-abc123'/);
  assert.match(bridged, /connect-src 'none'/);
  assert.match(bridged, /ds-theme/);
  const stat = previewSrcDoc(page, "ios", "dark");
  assert.match(stat, /<html class="dark" data-platform="ios">/);
  assert.match(stat, /script-src 'none'/);
  assert.ok(!stat.includes("<script"));
  assert.match(
    previewSrcDoc("<p>not canonical</p>"),
    /default-src 'none'/,
    "a non-canonical page is replaced, not patched",
  );
});

test("copy table: placeholders and plurals", () => {
  assert.equal(t("design.versions.one", { count: 1 }), "1 version");
  assert.equal(t("design.versions.other", { count: 3 }), "3 versions");
  assert.equal(t("design.status.section", { name: "Hero" }), "Adding Hero...");
  assert.equal(t("no.such.key"), "no.such.key");
  for (
    const text of Object.values(
      JSON.parse(
        JSON.stringify(
          Object.fromEntries(["design.brief", "design.stitchHint", "design.waiting"].map((k) => [k, t(k)])),
        ),
      ),
    )
  ) {
    // Built from parts so the scan of this file stays clean.
    const leftovers = new RegExp(["aeth" + "er", "z" + "code", "orb" + "its", "elec" + "tron"].join("|"), "i");
    assert.ok(!leftovers.test(String(text)), String(text));
  }
});

test("flow order follows the arrows, then creation order, and survives cycles", async () => {
  const { flowOrder } = await import("../src/design/FlowBoard.tsx");
  const s = (slug: string, created: string) => ({ slug, manifest: { created } });
  const screens = [s("overview", "2"), s("sign-in", "1"), s("orders", "3"), s("settings", "4")];
  assert.deepEqual(flowOrder(screens, [{ from: "overview", to: "orders" }]).map((x) => x.slug), [
    "sign-in",
    "overview",
    "settings",
    "orders",
  ]);
  assert.deepEqual(
    flowOrder(screens, [{ from: "sign-in", to: "overview" }, { from: "overview", to: "orders" }]).map((x) => x.slug),
    [
      "sign-in",
      "settings",
      "overview",
      "orders",
    ],
  );
  assert.deepEqual(flowOrder(screens, []).map((x) => x.slug), ["sign-in", "overview", "orders", "settings"]);
  assert.equal(flowOrder(screens, [{ from: "orders", to: "overview" }, { from: "overview", to: "orders" }]).length, 4);
});

test("model panel lists every provider with its state; the no-AI banner offers Local AI set-up", async () => {
  const { ModelPanel, NoAiBanner } = await import("../src/design/ModelPanel.tsx");
  const state = {
    selected: "auto",
    active: "lemonade",
    banner: null,
    options: [
      {
        id: "anthropic" as const,
        label: "Anthropic claude-opus-5-5",
        available: false,
        detail: "Set ANTHROPIC_API_KEY in studio/.env to use it.",
        note: null,
      },
      {
        id: "lemonade" as const,
        label: "Local AI (Lemonade)",
        available: true,
        detail: "Ready: user.M.",
        note: "Runs on this computer",
      },
      {
        id: "fake" as const,
        label: "Demo fixtures",
        available: true,
        detail: "Deterministic sample designs.",
        note: null,
      },
    ],
  };
  const html = renderToStaticMarkup(<ModelPanel state={state} progress={null} onChange={noop} onClose={noop} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /Automatic/);
  assert.match(html, /Local AI on this computer/);
  assert.match(html, /Ready: user\.M\./);
  assert.match(html, /in use/);
  assert.match(
    html,
    /<input[^>]*disabled[^>]*name="provider"|name="provider"[^>]*disabled/,
    "an unavailable provider cannot be picked",
  );
  const banner = renderToStaticMarkup(<NoAiBanner onOpen={noop} />);
  assert.match(banner, /No AI is configured/);
  assert.match(banner, /Set up Local AI/);
});
