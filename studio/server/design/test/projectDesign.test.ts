import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { designStem, nextRevisionFile, parseDesignManifest, slugifyDesignName } from "../../../shared/design/index.ts";
import { sanitizeDesignHtml, validateDesignHtml } from "../projectDesignSanitize.ts";
import { contentSha, isScriptTrusted } from "../projectDesignTrust.ts";
import { guardedDownload } from "../projectDesignNet.ts";
import { createDesignHandler } from "../projectDesignHandler.ts";
import { beginStep, designFilePath, listDesigns, readDesign, screenDir } from "../projectDesignStore.ts";
import { inlineRemote, runStitch, type StitchDeps, type StitchScreenLike } from "../projectDesignStitch.ts";

const GOOD =
  "<!doctype html><html><head><style>:root{--bg:#fff}body{background:var(--bg)}</style></head><body><main>Hi</main></body></html>";
const tmp = () => mkdtempSync(join(tmpdir(), "design-"));

describe("design logic", () => {
  it("slugifies and builds revision names", () => {
    assert.equal(slugifyDesignName("  Billing: Plans & Invoices! "), "billing-plans-invoices");
    assert.equal(slugifyDesignName("!!!"), "screen");
    assert.equal(designStem("v1-r2.html"), "v1");
    assert.equal(nextRevisionFile("v1.html", ["v1.html", "v1-r1.html"], "refine"), "v1-r2.html");
    assert.equal(nextRevisionFile("v1-r1.html", [], "fix"), "v1-fix1.html");
  });

  it("rejects scripts, remote URLs and non-HTML", () => {
    assert.deepEqual(validateDesignHtml(GOOD), []);
    assert.ok(validateDesignHtml('<div><script src="https://x.com/a.js"></script></div>').some((p) => /external script/.test(p)));
    assert.ok(validateDesignHtml("<div><script>1</script></div>").some((p) => /script/.test(p)));
    assert.deepEqual(validateDesignHtml("<div><script>1</script></div>", { allowInlineScripts: true }), []);
    assert.ok(validateDesignHtml('<div><img src="https://x.com/a.png"></div>').some((p) => /remote/.test(p)));
    assert.ok(validateDesignHtml('<div style="background:url(//x.com/a.png)"></div>').some((p) => /remote/.test(p)));
    assert.ok(validateDesignHtml('<div><link href="https://fonts.googleapis.com/x" rel="stylesheet"></div>').some((p) => /remote/.test(p)));
    assert.ok(validateDesignHtml("<style>@import 'https://x.com/a.css';</style><div></div>").some((p) => /remote/.test(p)));
    assert.ok(validateDesignHtml("# just markdown").some((p) => /Not an HTML/.test(p)));
    assert.ok(validateDesignHtml('<div onclick="x()"></div>').some((p) => /event handlers/.test(p)));
    assert.deepEqual(validateDesignHtml('<div><a href="https://example.com">link</a><img src="data:image/png;base64,AA"></div>'), []);
  });

  it("sanitises what it rejects", () => {
    const dirty =
      '<div onclick="x()"><script src="https://cdn.tailwindcss.com"></script><img src="https://x.com/a.png" alt="a"><span style="background:url(https://x.com/b.png)">t</span></div>';
    assert.deepEqual(validateDesignHtml(sanitizeDesignHtml(dirty)), []);
  });

  it("parses a manifest defensively", () => {
    const manifest = {
      version: 1,
      slug: "a",
      brief: "b",
      target: "web-mobile",
      model: "m",
      engine: "model",
      created: "t",
      steps: [{ id: "s", kind: "generate", instruction: "b", created: "t", files: ["v1.html", "../x.html"] }],
    };
    assert.deepEqual(parseDesignManifest(manifest)?.steps[0]?.files, ["v1.html"]);
    assert.equal(parseDesignManifest({ ...manifest, slug: "../evil" }), null);
    assert.equal(parseDesignManifest({ ...manifest, target: "tv" }), null);
    assert.equal(parseDesignManifest("nope"), null);
  });
});

describe("design store", () => {
  it("creates a manifest, lists variants, validates on read", async () => {
    const dir = tmp();
    const { slug, step } = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "Billing",
      brief: "Invoices list",
      target: "web-desktop",
      count: 3,
    });
    assert.equal(slug, "billing");
    assert.deepEqual(step.files, ["v1.html", "v2.html", "v3.html"]);
    writeFileSync(join(screenDir(dir, slug), "v1.html"), GOOD);
    writeFileSync(join(screenDir(dir, slug), "v2.html"), '<div><script src="https://x.com/a.js"></script></div>');
    const list = await listDesigns(dir);
    const files = list.screens[0]!.files;
    assert.equal(files.length, 2);
    assert.equal(files.find((f) => f.file === "v1.html")?.ok, true);
    assert.equal(files.find((f) => f.file === "v2.html")?.ok, false);
    assert.ok((await readDesign(dir, slug, "v1.html")).includes("<main>Hi</main>"));
    await assert.rejects(readDesign(dir, slug, "v2.html"), /external script/);
    const second = await beginStep(dir, { kind: "begin", step: "generate", name: "Billing", brief: "Other", target: "web-mobile" });
    assert.equal(second.slug, "billing-2");
    rmSync(dir, { recursive: true, force: true });
  });

  it("keeps history through refine and multi-screen steps", async () => {
    const dir = tmp();
    const { slug } = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "Home",
      brief: "Home",
      target: "flutter-phone",
      count: 1,
    });
    const refine = await beginStep(dir, { kind: "begin", step: "refine", slug, parent: "v1.html", instruction: "Bigger title" });
    assert.deepEqual(refine.step.files, ["v1-r1.html"]);
    const again = await beginStep(dir, { kind: "begin", step: "refine", slug, parent: "v1-r1.html", instruction: "Darker" });
    assert.deepEqual(again.step.files, ["v1-r2.html"]);
    const screens = await beginStep(dir, {
      kind: "begin",
      step: "screens",
      slug,
      parent: "v1-r2.html",
      names: ["Detail", "Settings", "Detail"],
    });
    assert.deepEqual(screens.step.files, ["s-detail.html", "s-settings.html"]);
    const manifest = JSON.parse(readFileSync(join(screenDir(dir, slug), "design.json"), "utf8"));
    assert.equal(manifest.steps.length, 4);
    assert.equal(manifest.steps[2].parent, "v1-r1.html");
    await assert.rejects(beginStep(dir, { kind: "begin", step: "refine", slug, parent: "../x.html", instruction: "x" }), /variant/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("never resolves outside design/<slug>", () => {
    const dir = tmp();
    assert.throws(() => screenDir(dir, ".."), /Not a design/);
    assert.throws(() => screenDir(dir, "a/b"), /Not a design/);
    assert.throws(() => designFilePath(dir, "a", "../../secret.html"), /Not a design file/);
    assert.throws(() => designFilePath(dir, "a", "x.txt"), /Not a design file/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("accepts only image references", async () => {
    const dir = tmp();
    const bad = beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "x",
      brief: "b",
      target: "web-desktop",
      reference: { mime: "text/html", bytes: new Uint8Array([1]) },
    });
    await assert.rejects(bad, /PNG, JPEG or WebP/);
    const ok = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "x",
      brief: "b",
      target: "web-desktop",
      reference: { mime: "image/png", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]) },
    });
    assert.ok(existsSync(join(screenDir(dir, ok.slug), "reference.png")));
    rmSync(dir, { recursive: true, force: true });
  });
});

const STITCH_HTML =
  '<html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"></head><body class="p-4"><div onclick="x()"><img src="https://lh3.googleusercontent.com/a" alt="a"></div></body></html>';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]);

function fakeStitch(downloads: string[]): StitchDeps {
  const screen = (n: number): StitchScreenLike => ({
    getHtml: async () => `https://example.test/html/${n}`,
    getImage: async () => `https://example.test/img/${n}`,
    variants: async (_p, o) => Array.from({ length: o.variantCount }, (_, i) => screen(n + i + 1)),
  });
  return {
    loadSdk: async () => ({ open: () => ({ generate: async () => screen(0), close: async () => undefined }) }),
    download: async (url) => {
      downloads.push(url);
      if (url.includes("/img/")) return { bytes: PNG, type: "image/png" };
      if (url.includes("tailwindcss")) return { bytes: new TextEncoder().encode("window.tailwind={}"), type: "text/javascript" };
      if (url.includes("fonts.googleapis")) {
        return { bytes: new TextEncoder().encode("@font-face{src:url(https://fonts.gstatic.com/a.woff2)}"), type: "text/css" };
      }
      if (url.includes("googleusercontent")) return { bytes: PNG, type: "image/png" };
      return { bytes: new TextEncoder().encode(STITCH_HTML), type: "text/html" };
    },
  };
}

describe("stitch engine (mocked SDK)", () => {
  it("saves sanitised variants and screenshots, then inlines on request", async () => {
    const dir = tmp();
    const seen: string[] = [];
    const deps = fakeStitch(seen);
    const { slug } = await runStitch(
      dir,
      { kind: "stitch-generate", name: "Landing", brief: "A landing page", target: "web-desktop", count: 2 },
      "test-key-1234",
      deps,
    );
    const list = await listDesigns(dir);
    const screen = list.screens[0]!;
    assert.equal(screen.manifest.engine, "stitch");
    assert.equal(screen.files.length, 2);
    assert.ok(screen.files.every((f) => f.ok && f.image === `${designStem(f.file)}.png`));
    const saved = readFileSync(designFilePath(dir, slug, "v1.html"), "utf8");
    assert.ok(!/script|googleusercontent|onclick/.test(saved));

    await inlineRemote(dir, slug, "v1.html", deps.download);
    const inlined = readFileSync(designFilePath(dir, slug, "v1.html"), "utf8");
    assert.ok(inlined.includes("window.tailwind") && inlined.includes("data:image/png;base64,"));
    assert.deepEqual(validateDesignHtml(inlined, { allowInlineScripts: true }), []);
    assert.equal(await isScriptTrusted(dir, slug, "v1.html", contentSha(inlined)), true);
    assert.equal((await listDesigns(dir)).screens[0]!.files.find((f) => f.file === "v1.html")?.scripts, true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("never leaks the key in an error and refuses http downloads", async () => {
    const dir = tmp();
    const deps: StitchDeps = {
      loadSdk: async () => ({
        open: () => ({
          generate: async () => {
            throw new Error("401 for key SECRET-KEY-123");
          },
          close: async () => undefined,
        }),
      }),
      download: async () => {
        throw new Error("x");
      },
    };
    await assert.rejects(
      runStitch(dir, { kind: "stitch-generate", name: "x", brief: "b", target: "web-mobile", count: 1 }, "SECRET-KEY-123", deps),
      (e: Error) => !e.message.includes("SECRET-KEY-123"),
    );
    await assert.rejects(guardedDownload("http://example.com/a", { maxBytes: 10, hostAllowed: () => true }), /https/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("design handler", () => {
  it("reports the Stitch key state, refuses stitch without a key and unknown commands", async () => {
    const dir = tmp();
    const none = createDesignHandler({ root: dir, stitchKey: null, stitch: fakeStitch([]) });
    assert.deepEqual(await none({ kind: "stitch-status" }), { configured: false });
    await assert.rejects(none({ kind: "stitch-generate", name: "x", brief: "b", target: "web-desktop", count: 1 }), /STITCH_API_KEY/);
    await assert.rejects(none({ kind: "nope" }), /Unknown design command/);
    const some = createDesignHandler({ root: dir, stitchKey: "abcdefgh1234", stitch: fakeStitch([]) });
    assert.deepEqual(await some({ kind: "stitch-status" }), { configured: true });
    rmSync(dir, { recursive: true, force: true });
  });

  it("announces a recorded step so the server can start the model work", async () => {
    const dir = tmp();
    const seen: unknown[] = [];
    const handle = createDesignHandler({ root: dir, stitchKey: null, stitch: fakeStitch([]), onBegun: (e) => seen.push(e) });
    const begun =
      (await handle({ kind: "begin", step: "generate", name: "Billing", brief: "Invoices", target: "web-desktop", count: 2 })) as {
        slug: string;
        step: { id: string };
      };
    assert.deepEqual(seen, [{ kind: "step", slug: begun.slug, stepId: begun.step.id }]);
    rmSync(dir, { recursive: true, force: true });
  });
});
