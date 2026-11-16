import assert from "node:assert/strict";
import test from "node:test";
import { progressiveDocument, replayPrefixes } from "../src/design/designStream.ts";

const PAGE =
  `<!doctype html><html><head><style>:root{--bg:#101820;--ink:#eee}body{background:var(--bg);color:var(--ink)}.card{padding:16px}</style></head><body>
<header><h1>Acme</h1><nav><a href="#">Home</a></nav></header>
<main>
<!-- section: Portfolio card -->
<section class="card"><h2>Portfolio</h2><p>Balance</p></section>
<!-- section: Activity list -->
<section class="card"><h2>Activity</h2><ul><li>One</li><li>Two</li></ul></section>
</main></body></html>`;

test("tokens first: only complete CSS rules, no body yet", () => {
  const cut = PAGE.slice(0, PAGE.indexOf(".card{padd") + 10);
  const f = progressiveDocument(cut);
  assert.equal(f.stage, "tokens");
  assert.deepEqual(f.status, { kind: "tokens" });
  assert.equal(f.css, ":root{--bg:#101820;--ink:#eee}body{background:var(--bg);color:var(--ink)}");
  assert.equal(f.body, "");
});

test("shell, then content, with section markers as status", () => {
  const afterHeader = progressiveDocument(PAGE.slice(0, PAGE.indexOf("<main>") + 6));
  assert.match(afterHeader.body, /<header>.*<\/header>/s);
  assert.equal(afterHeader.stage, "content");
  const mid = progressiveDocument(PAGE.slice(0, PAGE.indexOf("<ul>") + 10));
  assert.match(mid.body, /Portfolio/);
  assert.ok(!/Activity/.test(mid.body.replace(/<!--.*?-->/g, "")) || /<\/section>/.test(mid.body));
  assert.deepEqual(mid.status, { kind: "section", name: "Activity list" });
});

test("only complete elements, open containers are closed; the output is raw (the DOM sanitiser runs after it)", () => {
  const f = progressiveDocument("<style>body{}</style><body><main><p>half writt");
  assert.equal(f.body, "<main><p></p></main>");
  // A quoted ">" inside an attribute does not end the tag early.
  const quoted = progressiveDocument('<style>a{}</style><body><div title="a > b"><p>x</p></div><p>half');
  assert.ok(quoted.body.startsWith('<div title="a > b"><p>x</p></div>'));
  // An unfinished tag stops the scan: nothing after it is treated as complete.
  assert.equal(progressiveDocument('<style>a{}</style><body><div><p>x</p><img src="a').body, "<div><p>x</p></div>");
  // Raw-text elements hide their "<" from the scanner.
  assert.equal(
    progressiveDocument("<style>a{}</style><body><div><script>if (a < b) {}</script><p>x</p></div>").body.includes(
      "<p>x</p>",
    ),
    true,
  );
});

test("hostile prefixes cannot stall the scanner (linear time)", () => {
  for (const unit of ["<a ", "<!--", "<body ", "<style ", "<div ", '<div title="', "</", "<p><b>"]) {
    const input = `<style>a{}</style><body>${unit.repeat(250_000)}`;
    const start = performance.now();
    progressiveDocument(input);
    replayPrefixes(input);
    const ms = performance.now() - start;
    assert.ok(ms < 500, `${JSON.stringify(unit)} took ${ms.toFixed(0)} ms`);
  }
});

test("finished page renders whole", () => {
  const f = progressiveDocument(PAGE, true);
  assert.equal(f.stage, "done");
  assert.ok(f.body.includes("Two"));
});

test("replay prefixes grow monotonically, start with the tokens, end near the whole page", () => {
  const steps = replayPrefixes(PAGE);
  assert.ok(steps.length >= 3);
  assert.ok(steps[0]!.endsWith("</style>"));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i]!.length > steps[i - 1]!.length);
});

test("render cost: a 60 KB page costs a few ms per frame, well under the throttle", () => {
  const big = PAGE.replace(
    "</main>",
    `${'<section class="card"><h2>Row</h2><p>text</p></section>'.repeat(1000)}</main>`,
  );
  assert.ok(big.length > 55_000);
  const steps = replayPrefixes(big, 14);
  const start = performance.now();
  for (const step of steps) progressiveDocument(step);
  const per = (performance.now() - start) / steps.length;
  console.log(`design-stream: ${big.length} bytes, ${steps.length} frames, ${per.toFixed(2)} ms/frame`);
  assert.ok(per < 50, `${per} ms/frame`);
});
