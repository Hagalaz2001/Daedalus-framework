import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { chooseEditMode, parseDesignPatch } from "../../../shared/design/index.ts";
import { importStitchExport, writeDesignMd } from "../projectDesignImport.ts";
import { applyDesignPatch, settlePatches } from "../projectDesignPatch.ts";
import { beginStep, listDesigns, screenDir } from "../projectDesignStore.ts";

const PAGE =
  '<!doctype html><html><head><style>:root{--a:#fff}</style></head><body><header><h1 id="t">Title</h1></header><main><p class="x">One</p><p class="x">Two</p></main></body></html>';
const tmp = () => mkdtempSync(join(tmpdir(), "design-patch-"));

describe("surgical patches", () => {
  it("validates patch JSON", () => {
    assert.throws(() => parseDesignPatch({ ops: [] }), /1-30/);
    assert.throws(() => parseDesignPatch({ ops: [{ op: "text", selector: "p:contains(x)", text: "a" }] }), /selector/);
    assert.throws(
      () => parseDesignPatch({ ops: [{ op: "attr", selector: "a", name: "onclick", value: "x()" }] }),
      /not allowed/,
    );
    assert.throws(
      () => parseDesignPatch({ ops: [{ op: "attr", selector: "a", name: "href", value: "javascript:alert(1)" }] }),
      /not allowed/,
    );
    assert.throws(() => parseDesignPatch({ ops: [{ op: "explode", selector: "a" }] }), /unknown/);
  });

  it("applies exact matches and leaves the rest untouched", () => {
    const patch = parseDesignPatch({
      ops: [{ op: "text", selector: "#t", text: "New" }, { op: "classes", selector: ".x", add: ["big"], all: true }],
    });
    const out = applyDesignPatch(PAGE, patch);
    assert.ok(out.includes(">New</h1>") && out.includes('class="x big"'));
    assert.ok(out.includes(":root{--a:#fff}"));
  });

  it("rejects the whole patch when a selector is ambiguous or missing", () => {
    assert.throws(
      () => applyDesignPatch(PAGE, parseDesignPatch({ ops: [{ op: "text", selector: "p", text: "x" }] })),
      /matched 2/,
    );
    assert.throws(
      () => applyDesignPatch(PAGE, parseDesignPatch({ ops: [{ op: "remove", selector: "#nope" }] })),
      /matched 0/,
    );
  });

  it("sanitises inserted html", () => {
    const patch = parseDesignPatch({
      ops: [{
        op: "append",
        selector: "main",
        html: '<img src="https://x.com/a.png"><script>1</script><b onclick="x()">ok</b>',
      }],
    });
    const out = applyDesignPatch(PAGE, patch);
    assert.ok(!/script|x\.com|onclick/.test(out) && out.includes("ok"));
  });

  it("chooses the edit mode by request size", () => {
    assert.equal(chooseEditMode("Make the title bigger"), "surgical");
    assert.equal(chooseEditMode("Switch to dark mode"), "full");
    assert.equal(chooseEditMode("Translate the page to German"), "full");
  });

  it("settles a patch file into a new version, and reports a failure", async () => {
    const dir = tmp();
    const { slug } = await beginStep(dir, {
      kind: "begin",
      step: "generate",
      name: "Home",
      brief: "Home",
      target: "web-desktop",
      count: 1,
    });
    writeFileSync(join(screenDir(dir, slug), "v1.html"), PAGE);
    await beginStep(dir, {
      kind: "begin",
      step: "refine",
      slug,
      parent: "v1.html",
      instruction: "Rename title",
      mode: "surgical",
    });
    writeFileSync(
      join(screenDir(dir, slug), "v1-r1.patch.json"),
      JSON.stringify({ ops: [{ op: "text", selector: "p", text: "x" }] }),
    );
    let result = await settlePatches(dir, (await listDesigns(dir)).screens);
    assert.match(result.errors.get(slug)!["v1-r1.html"]!, /matched 2/);
    assert.equal(existsSync(join(screenDir(dir, slug), "v1-r1.html")), false);
    writeFileSync(
      join(screenDir(dir, slug), "v1-r1.patch.json"),
      JSON.stringify({ ops: [{ op: "text", selector: "#t", text: "Renamed" }] }),
    );
    result = await settlePatches(dir, (await listDesigns(dir)).screens);
    assert.equal(result.wrote, true);
    assert.ok(readFileSync(join(screenDir(dir, slug), "v1-r1.html"), "utf8").includes("Renamed"));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("DESIGN.md and Stitch export import", () => {
  it("never overwrites an existing DESIGN.md", async () => {
    const dir = tmp();
    await assert.rejects(writeDesignMd(dir, "no front matter"), /front matter/);
    assert.deepEqual(await writeDesignMd(dir, "---\nname: A\n---\n"), { file: "DESIGN.md" });
    assert.deepEqual(await writeDesignMd(dir, "---\nname: B\n---\n"), { file: "design/DESIGN.generated.md" });
    assert.ok(readFileSync(join(dir, "DESIGN.md"), "utf8").includes("name: A"));
    rmSync(dir, { recursive: true, force: true });
  });

  it("imports an export folder as a sanitised, labelled design", async () => {
    const dir = tmp();
    const folder = tmp();
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, "code.html"),
      '<html><head><script src="https://cdn.tailwindcss.com"></script></head><body><main><img src="https://lh3.googleusercontent.com/a"></main></body></html>',
    );
    writeFileSync(join(folder, "DESIGN.md"), "---\r\nname: Imported\r\n---\r\nprose");
    writeFileSync(join(folder, "screen.png"), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]));
    const made = await importStitchExport(dir, folder);
    assert.match(made.importedMd ?? "", /name: Imported/);
    assert.equal(existsSync(join(dir, "DESIGN.md")), false);
    const screen = (await listDesigns(dir)).screens[0]!;
    assert.equal(screen.manifest.model, "stitch-export");
    assert.deepEqual(screen.files.map((f) => [f.ok, f.image]), [[true, "v1.png"]]);
    await assert.rejects(importStitchExport(dir, tmp()), /no code\.html/);
    rmSync(dir, { recursive: true, force: true });
    rmSync(folder, { recursive: true, force: true });
  });
});
