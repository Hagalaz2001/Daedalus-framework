import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseRouteMap } from "../../../shared/design/index.ts";
import { composeScreen } from "../projectDesignShells.ts";
import { guardedDownload, type Hop } from "../projectDesignNet.ts";
import { beginStep, listDesigns, screenDir, VERDICT_VERSION } from "../projectDesignStore.ts";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { setVerdictFile } from "../projectDesignVerdicts.ts";
import { getVerdict, putVerdict } from "../projectDesignVerdicts.ts";

const SHELL = "<!doctype html><html><head></head><body><nav data-nav></nav><main data-outlet></main></body></html>";
const map = (badge: unknown) => ({
  appId: "app",
  defaultRoute: "home",
  navArchetype: "bottomTabs",
  routes: [{ id: "home", path: "/", title: "Home", slot: "primary", nav: { label: "Home", order: 1, badge } }],
});

describe("route map badge kind", () => {
  it("accepts count and dot, rejects anything else before it reaches markup", () => {
    assert.doesNotThrow(() => parseRouteMap(map({ kind: "count", value: 2 })));
    assert.doesNotThrow(() => parseRouteMap(map({ kind: "dot" })));
    assert.throws(() => parseRouteMap(map({ kind: '"><script>x</script>' })), /badge kind/);
    assert.throws(() => parseRouteMap(map({ kind: "count", value: Number.NaN })), /badge kind/);
  });
  it("composeScreen never interpolates an unknown kind even from a hand-built map", () => {
    const bad = {
      ...map(undefined),
      routes: [{ id: "home", path: "/", title: "H", slot: "primary", nav: { label: "H", order: 1, badge: { kind: '"><b>' } } }],
    } as never;
    const out = composeScreen(SHELL, "<p>x</p>", bad, "home");
    assert.ok(!out.includes("<b>") && !out.includes("nav-badge"));
  });
});

describe("composed pages are cached by shell, body and routes", () => {
  it("a changed shell invalidates the verdict, an unchanged poll reuses it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "design-compose-"));
    mkdirSync(join(dir, "design", "shell"), { recursive: true });
    writeFileSync(join(dir, "design", "shell", "app.html"), SHELL);
    writeFileSync(join(dir, "design", "shell", "app.routes.json"), JSON.stringify(map(undefined)));
    const { slug } = await beginStep(dir, { kind: "begin", step: "generate", name: "Home", brief: "Home", target: "web-mobile", count: 1 });
    writeFileSync(join(screenDir(dir, slug), "v1.html"), "<!-- shell: app route: home -->\n<section>Hi</section>");
    assert.equal((await listDesigns(dir)).screens[0]!.files[0]!.ok, true);
    assert.equal((await listDesigns(dir)).screens[0]!.files[0]!.ok, true);
    // The shell now carries a script: the composed page must be re-checked and fail, although v1.html is untouched.
    writeFileSync(join(dir, "design", "shell", "app.html"), SHELL.replace("<nav", "<script>alert(1)</script><nav"));
    assert.equal((await listDesigns(dir)).screens[0]!.files[0]!.ok, false);
  });
  it("stores a verdict by content key", async () => {
    await putVerdict("k1", { problems: ["x"], remote: false });
    assert.deepEqual(await getVerdict("k1"), { problems: ["x"], remote: false });
  });
});

// Fingerprint of the sanitiser policy per verdict version. Changing projectDesignSanitize.ts or projectDesignPolicy.ts
// changes the hash and fails this test until VERDICT_VERSION is bumped and the new hash is added here, so verdicts
// persisted under the old policy are never reused.
const POLICY_FINGERPRINTS: Record<string, string> = {
  p1: "e53563f25b6db94914eed62a6dfdf6d6a98bec746501a5f58ad37ac3cd437105",
};

describe("persisted verdicts", () => {
  it("VERDICT_VERSION is bumped whenever the sanitiser policy changes", () => {
    const hash = createHash("sha256");
    for (const file of ["../projectDesignSanitize.ts", "../../../shared/design/projectDesignPolicy.ts"]) {
      hash.update(readFileSync(new URL(file, import.meta.url), "utf8").replace(/\r\n/g, "\n"));
    }
    assert.equal(
      hash.digest("hex"),
      POLICY_FINGERPRINTS[VERDICT_VERSION],
      "The sanitiser policy changed: bump VERDICT_VERSION in projectDesignStore.ts and add the new hash here.",
    );
  });
  it("writes the file atomically: whole JSON, no temp file left", async () => {
    const dir = mkdtempSync(join(tmpdir(), "design-verdicts-"));
    const target = join(dir, "design-verdicts.json");
    setVerdictFile(target);
    await putVerdict("a", { problems: [], remote: false });
    await new Promise((done) => setTimeout(done, 1300));
    assert.deepEqual(JSON.parse(readFileSync(target, "utf8")), { a: { problems: [], remote: false } });
    assert.deepEqual(readdirSync(dir), ["design-verdicts.json"]);
    assert.ok(existsSync(target));
    setVerdictFile(null);
  });
});

describe("downloader overall deadline", () => {
  it("aborts a body that trickles forever", async () => {
    let aborted = false;
    const slow: Hop = {
      status: 200,
      headers: {},
      abort: () => void (aborted = true),
      body: {
        async *[Symbol.asyncIterator]() {
          while (!aborted) {
            await new Promise((r) => setTimeout(r, 20));
            yield new Uint8Array(1);
          }
        },
      },
    };
    await assert.rejects(
      guardedDownload("https://ok.googleusercontent.com/a", {
        maxBytes: 1e9,
        deadlineMs: 150,
        hostAllowed: () => true,
        transport: async () => slow,
        resolver: async () => [{ address: "93.184.216.34", family: 4 }],
      }),
      /too long/,
    );
    assert.equal(aborted, true);
  });
});
