import assert from "node:assert/strict";
import test from "node:test";
import { checkDesignMd, parseFrontMatter } from "../../shared/design/designMd.ts";
import { buildDesignMd } from "../../shared/design/designMdGenerate.ts";

const SAMPLE = `---
name: Test Kit
colors:
  surface: '#0f131c'
  on-surface: '#dfe2ef'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  error: '#ffb4ab'
  on-error: '#ffffff'
typography:
  body-md:
    fontFamily: Inter
    fontSize: 14px
    lineHeight: 20px
rounded:
  DEFAULT: 0.5rem
spacing:
  space-md: 1rem
---

## Colors

- **primary** #c0c1ff
- **surface** #090d16
`;

test("reads the Stitch-style front matter and compiles it to custom properties", () => {
  const parsed = parseFrontMatter(SAMPLE);
  assert.equal(parsed?.tree.name, "Test Kit");
  const report = checkDesignMd(SAMPLE);
  assert.ok(report.css.includes("--color-primary: #c0c1ff;"));
  assert.ok(report.css.includes("--type-body-md-font-size: 14px;"));
  assert.ok(report.css.includes("--radius-default: 0.5rem;"));
  assert.ok(report.css.includes("--space-space-md: 1rem;"));
});

test("flags a prose colour that disagrees with the front matter, and weak pairs", () => {
  const report = checkDesignMd(SAMPLE);
  assert.equal(report.mismatches.length, 1);
  assert.match(report.mismatches[0]!, /surface: prose says #090d16/);
  assert.deepEqual(report.failing.map((f) => f.bg), ["error"]);
});

test("rejects text without front matter", () => {
  assert.equal(checkDesignMd("# just prose").errors.length, 1);
});

test("a generated DESIGN.md passes its own checks, light and dark, with prose equal to front matter", async () => {
  const md = await buildDesignMd({ name: "Acme Notes", seed: "#2f6f5e" });
  const report = checkDesignMd(md);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.mismatches, []);
  assert.deepEqual(report.failing, []);
  assert.ok(report.checkedPairs > 10);
  assert.ok(md.includes("colors-dark:"));
  const dark = checkDesignMd(
    md.replace(/\ncolors:\n[\s\S]*?\ncolors-dark:/, "\ncolors-light:").replace("colors-light:", "colors-light-removed:").replace(
      "\ncolors-dark:",
      "\ncolors:",
    ),
  );
  assert.deepEqual(dark.failing, []);
  await assert.rejects(buildDesignMd({ name: "x", seed: "blue" }), /seed colour/);
});
