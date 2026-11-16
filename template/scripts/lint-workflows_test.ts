import { assertEquals } from "jsr:@std/assert@1";
import { scanWorkflowText } from "./lint-workflows.ts";

const sha = "3d3c42e5aac5ba805825da76410c181273ba90b1";

Deno.test("pinned actions, local actions and top-level permissions pass", () => {
  const yml =
    `name: x\non: push\npermissions:\n  contents: read\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@${sha} # v7\n      - uses: ./.github/actions/setup\n`;
  assertEquals(scanWorkflowText("w.yml", yml, true), []);
});

Deno.test("tags, branches, missing permissions and pull_request_target are reported", () => {
  const yml =
    `name: x\non:\n  pull_request_target:\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n      - uses: foo/bar@main\n`;
  const problems = scanWorkflowText("w.yml", yml, true);
  assertEquals(problems.length, 4);
});

Deno.test("comments and allow markers are skipped; composite actions need no permissions", () => {
  const yml = `# uses: actions/checkout@v4\nruns:\n  steps:\n    - uses: x/y@v1 # lint-workflows:allow\n`;
  assertEquals(scanWorkflowText("action.yml", yml, false), []);
});

Deno.test("docker images need a digest", () => {
  assertEquals(scanWorkflowText("a.yml", "    - uses: docker://alpine:3\n", false).length, 1);
  assertEquals(scanWorkflowText("a.yml", `    - uses: docker://alpine@sha256:${"a".repeat(64)}\n`, false), []);
});
