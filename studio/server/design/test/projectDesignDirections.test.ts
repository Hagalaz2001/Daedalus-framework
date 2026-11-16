import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseDirectionSelection, parseDirectionSet, parseRouteMap, planDirections, routeMapFor } from "../../../shared/design/index.ts";
import { createDesignHandler } from "../projectDesignHandler.ts";
import {
  beginDirections,
  listDirections,
  readDirectionScreen,
  selectDirection,
  unlockSelection,
  writeDirectionDesignMd,
} from "../projectDesignDirections.ts";

const page = (text: string) =>
  `<!doctype html><html data-platform="web"><head><style>:root{--bg:#fff}</style></head><body><main>${text}</main></body></html>`;
const MD = "---\nname: Test\ncolors:\n  primary: '#1f5a4d'\n---\n\n## Colors\n";
const tmp = () => mkdtempSync(join(tmpdir(), "design-dir-"));

async function fillDirection(dir: string, id: string, screens: { id: string; file: string }[]) {
  await writeDirectionDesignMd(dir, id, MD);
  for (const screen of screens) writeFileSync(join(dir, screen.file), page(screen.id));
}

describe("design directions", () => {
  it("plans 3 to 5 directions with a shared valid route map", async () => {
    const dir = tmp();
    const set = await beginDirections(dir, { brief: "A booking app for a small clinic", stack: "react-flutter" });
    assert.equal(set.directions.length, 3);
    assert.deepEqual(set.directions[0]!.screens.map((s) => s.id), ["home", "list", "detail", "create", "settings"]);
    const view = await listDirections(dir);
    assert.equal(view.routeMap?.routes.length, 5);
    assert.deepEqual(view.routeMap?.routes.filter((r) => r.slot === "primary").map((r) => r.id), ["home", "list", "detail", "create"]);
    assert.deepEqual(view.files, { d1: [], d2: [], d3: [] });
    assert.equal(
      parseDirectionSet(JSON.parse(readFileSync(join(dir, "design/directions/directions.json"), "utf8")))?.stack,
      "react-flutter",
    );
    assert.equal(parseRouteMap(routeMapFor(set)).defaultRoute, "home");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects bad input", async () => {
    const dir = tmp();
    const base = { brief: "b", stack: "react-native" as const };
    await assert.rejects(beginDirections(dir, { ...base, count: 2 }), /3 to 5/);
    await assert.rejects(beginDirections(dir, { ...base, count: 6 }), /3 to 5/);
    await assert.rejects(beginDirections(dir, { ...base, screens: ["One", "Two"] }), /3 to 6/);
    await assert.rejects(beginDirections(dir, { brief: "", stack: "react-native" }), /brief/);
    await assert.rejects(beginDirections(dir, { brief: "b", stack: "swift" as never }), /react-flutter or react-native/);
    assert.equal(planDirections({ ...base, count: 5, screens: ["A b", "A-b", "C", "D"] }, "t").directions[0]!.screens.length, 3); // duplicates collapse
    rmSync(dir, { recursive: true, force: true });
  });

  it("locks only a complete, clean direction, and writes design/selected.json for engineering", async () => {
    const dir = tmp();
    const set = await beginDirections(dir, { brief: "Clinic app", stack: "react-native", count: 4 });
    const d = set.directions[1]!;
    await assert.rejects(selectDirection(dir, d.id, "x"), /not complete: DESIGN\.md; .*Home \(not written yet\)/);
    await fillDirection(dir, d.id, d.screens);
    writeFileSync(join(dir, d.screens[2]!.file), page("<script>alert(1)</script>"));
    await assert.rejects(selectDirection(dir, d.id), /Detail \(blocked: Contains a script/);
    writeFileSync(join(dir, d.screens[2]!.file), page("detail"));
    await assert.rejects(selectDirection(dir, "nope"), /Unknown direction/);
    await assert.rejects(selectDirection(dir, d.id, "n".repeat(4001)), /4000/);
    const selection = await selectDirection(dir, d.id, "  Make the tab bar taller  ");
    assert.equal(selection.notes, "Make the tab bar taller");
    const saved = parseDirectionSelection(JSON.parse(readFileSync(join(dir, "design/selected.json"), "utf8")));
    assert.deepEqual([saved?.directionId, saved?.designMd, saved?.routeMap, saved?.stack, saved?.screens.length], [
      d.id,
      d.designMd,
      "design/directions/routes.json",
      "react-native",
      5,
    ]);
    await assert.rejects(selectDirection(dir, d.id), /already locked/);
    await assert.rejects(beginDirections(dir, { brief: "again", stack: "react-native" }), /locked/);
    await unlockSelection(dir);
    assert.equal(existsSync(join(dir, "design/selected.json")), false);
    assert.equal((await listDirections(dir)).selection, null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("validates DESIGN.md and screen reads", async () => {
    const dir = tmp();
    const set = await beginDirections(dir, { brief: "Clinic app", stack: "react-flutter" });
    await assert.rejects(writeDirectionDesignMd(dir, "d9", MD), /Unknown direction/);
    await assert.rejects(writeDirectionDesignMd(dir, "d1", "no front matter"), /colour tokens/);
    await assert.rejects(readDirectionScreen(dir, "../x", "home"), /Not a direction screen/);
    await assert.rejects(readDirectionScreen(dir, "d1", "home"), /ENOENT|no such file/i);
    await writeDirectionDesignMd(dir, "d1", MD);
    writeFileSync(join(dir, set.directions[0]!.screens[0]!.file), page("hi"));
    assert.ok((await readDirectionScreen(dir, "d1", "home")).includes("<main>hi</main>"));
    rmSync(dir, { recursive: true, force: true });
  });

  it("the handler runs the whole directions lifecycle", async () => {
    const dir = tmp();
    const seen: unknown[] = [];
    const handle = createDesignHandler({
      root: dir,
      stitchKey: null,
      stitch: {
        loadSdk: async () => {
          throw new Error("no");
        },
        download: async () => {
          throw new Error("no");
        },
      },
      onBegun: (e) => seen.push(e),
    });
    const set = (await handle({ kind: "directions-begin", brief: "Clinic app", stack: "react-flutter", count: 3 })) as Awaited<
      ReturnType<typeof beginDirections>
    >;
    assert.deepEqual(seen, [{ kind: "directions" }]);
    await fillDirection(dir, "d1", set.directions[0]!.screens);
    const view = (await handle({ kind: "directions-list" })) as Awaited<ReturnType<typeof listDirections>>;
    assert.equal(view.designMd.d1, true);
    assert.match(String(await handle({ kind: "directions-md", id: "d1" })), /^---/);
    await handle({ kind: "directions-select", directionId: "d1", notes: "ok" });
    assert.equal(((await handle({ kind: "directions-list" })) as Awaited<ReturnType<typeof listDirections>>).selection?.directionId, "d1");
    await handle({ kind: "directions-unlock" });
    assert.equal(((await handle({ kind: "directions-list" })) as Awaited<ReturnType<typeof listDirections>>).selection, null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("cost of listing 5 directions x 5 screens is parsed once (verdict cache)", async () => {
    const dir = tmp();
    const set = await beginDirections(dir, { brief: "Clinic app", stack: "react-flutter", count: 5 });
    for (const direction of set.directions) await fillDirection(dir, direction.id, direction.screens);
    const first = performance.now();
    await listDirections(dir);
    const cold = performance.now() - first;
    const second = performance.now();
    for (let i = 0; i < 20; i++) await listDirections(dir);
    const warm = (performance.now() - second) / 20;
    console.log(`GATE directions list: 25 pages cold ${cold.toFixed(1)} ms, warm ${warm.toFixed(1)} ms per poll`);
    assert.ok(warm < cold || warm < 10);
    rmSync(dir, { recursive: true, force: true });
  });
});
