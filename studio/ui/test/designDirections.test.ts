import assert from "node:assert/strict";
import test from "node:test";
import { planDirections } from "../../shared/design/index.ts";
import { makeFenceToken } from "../../shared/design/designPrompts.ts";
import { directionScore } from "../src/design/DesignDirections.tsx";

test("fence tokens are random per prompt and 16 hex characters", () => {
  const a = makeFenceToken();
  assert.notEqual(a, makeFenceToken());
  assert.match(a, /^[0-9a-f]{16}$/);
});

test("plans 3 to 5 directions with the same key screens", () => {
  const set = planDirections(
    { brief: "A booking app for a small clinic", stack: "react-flutter", count: 4 },
    "2026-01-01T00:00:00Z",
  );
  assert.equal(set.directions.length, 4);
  assert.deepEqual(set.directions[0]!.screens.map((s) => s.id), set.directions[3]!.screens.map((s) => s.id));
});

test("direction score: a clean adaptive page passes nearly everything, a slop page does not", () => {
  const clean =
    `<!doctype html><html><head><style>:root{--bg:#fff;--ink:#111;--s:16px}body{background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif;padding:16px}h1{font-size:24px}</style></head><body><main><h1>Hi</h1></main></body></html>`;
  const slop =
    `<html><head><style>body{background:linear-gradient(#667eea,#764ba2);color:#999;text-align:center;padding:13px}</style></head><body><p>Lorem ipsum ✨</p></body></html>`;
  assert.equal(directionScore([], "b"), null);
  assert.ok(directionScore([clean], "b")! > 0.9);
  assert.ok(directionScore([slop], "b")! < directionScore([clean], "b")! - 0.15);
  const mixed = directionScore([clean, slop], "b")!;
  assert.ok(mixed < directionScore([clean], "b")! && mixed > directionScore([slop], "b")!);
});
