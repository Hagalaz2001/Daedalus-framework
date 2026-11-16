import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import { lintDesign } from "../../shared/design/designLint.ts";
import { readContext, tokenMap } from "../context.ts";
import { beginStep, listDesigns, readDesign } from "../design/projectDesignStore.ts";
import { settlePatches } from "../design/projectDesignPatch.ts";
import { createJobs, type StudioEvent } from "../jobs.ts";
import { createFakeProvider } from "../providers/fake.ts";
import type { Provider } from "../providers/types.ts";
import { cleanup, makeProject, TOKENS } from "./helpers.ts";

const setup = (provider: Provider = createFakeProvider(0)) => {
  const root = makeProject();
  const events: StudioEvent[] = [];
  const jobs = createJobs({ ctx: () => readContext(root), provider, bus: { emit: (e) => events.push(e) } });
  return { root, events, jobs };
};

Deno.test("generate: one call per variant, all files written, sanitised, streamed and lint-clean against the project tokens", async () => {
  const { root, events, jobs } = setup();
  try {
    const begun = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "Sales dashboard for a small shop",
      target: "web-desktop",
      count: 3,
    });
    await jobs.runStep(root, begun.slug, begun.step.id);
    await jobs.idle();
    const list = await listDesigns(root);
    const files = list.screens[0]!.files;
    assertEquals(files.map((f) => f.file).sort(), ["v1.html", "v2.html", "v3.html"]);
    assert(files.every((f) => f.ok && !f.scripts), "every file passes the sanitiser gate");
    const layouts = new Set<string>();
    for (const f of files) {
      const html = await readDesign(root, begun.slug, f.file);
      layouts.add(
        html.includes('<aside class="sidebar"') ? "sidebar" : html.includes('<nav class="rail"') ? "rail" : "top",
      );
      assertEquals(
        lintDesign(html, { brief: "Sales dashboard", target: "web-desktop", projectTokens: tokenMap(TOKENS) }).map((
          w,
        ) => w.id),
        [],
        `${f.file} lint`,
      );
    }
    assertEquals(layouts.size, 3, "variants differ in layout");
    assert(events.some((e) => e.type === "write" && !e.done), "partial html was streamed");
    assert(events.some((e) => e.type === "write" && e.done && e.key === `${begun.slug}/v1.html`));
    assertEquals(jobs.state(`${begun.slug}/${begun.step.id}`)?.state, "done");
  } finally {
    cleanup(root);
  }
});

Deno.test("generate: the generated page carries the project's token block verbatim", async () => {
  const { root, jobs } = setup();
  try {
    const begun = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "dashboard",
      target: "web-desktop",
      count: 1,
    });
    await jobs.runStep(root, begun.slug, begun.step.id);
    await jobs.idle();
    const html = await readDesign(root, begun.slug, "v1.html");
    assertStringIncludes(html, "--color-primary:");
    assertStringIncludes(html, "#2a4bd7");
    assertStringIncludes(html, ":root.dark");
  } finally {
    cleanup(root);
  }
});

Deno.test("refine (surgical): the patch is applied to a new version and the parent stays untouched", async () => {
  const { root, jobs } = setup();
  try {
    const g = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "dashboard",
      target: "web-desktop",
      count: 1,
    });
    await jobs.runStep(root, g.slug, g.step.id);
    await jobs.idle();
    const before = await readDesign(root, g.slug, "v1.html");
    const r = await beginStep(root, {
      kind: "begin",
      step: "refine",
      slug: g.slug,
      parent: "v1.html",
      instruction: 'Rename the title to "Today at a glance"',
      mode: "surgical",
    });
    await jobs.runStep(root, g.slug, r.step.id);
    await jobs.idle();
    await settlePatches(root, (await listDesigns(root)).screens);
    const after = await readDesign(root, g.slug, r.step.files[0]!);
    assertStringIncludes(after, "Today at a glance");
    assertEquals(await readDesign(root, g.slug, "v1.html"), before);
    assertEquals(jobs.state(`${g.slug}/${r.step.id}`)?.state, "done");
  } finally {
    cleanup(root);
  }
});

Deno.test("refine: a patch that does not apply escalates to a full rewrite instead of failing", async () => {
  const fake = createFakeProvider(0);
  const provider: Provider = {
    ...fake,
    call: (
      input,
    ) => (input.tool.name === "write_patch"
      ? Promise.resolve({ ops: [{ op: "text", selector: "#does-not-exist", text: "x" }] })
      : fake.call(input)),
  };
  const { root, jobs } = setup(provider);
  try {
    const g = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "dashboard",
      target: "web-desktop",
      count: 1,
    });
    await jobs.runStep(root, g.slug, g.step.id);
    await jobs.idle();
    const r = await beginStep(root, {
      kind: "begin",
      step: "refine",
      slug: g.slug,
      parent: "v1.html",
      instruction: "tighten",
      mode: "surgical",
    });
    await jobs.runStep(root, g.slug, r.step.id);
    await jobs.idle();
    assertEquals(jobs.state(`${g.slug}/${r.step.id}`)?.state, "done");
    assert((await listDesigns(root)).screens[0]!.files.some((f) => f.file === r.step.files[0]));
  } finally {
    cleanup(root);
  }
});

Deno.test("a failing provider is reported per file and does not stop the other variants", async () => {
  const fake = createFakeProvider(0);
  const provider: Provider = {
    ...fake,
    call: (input) => (/variant 2 of/.test(input.user) ? Promise.reject(new Error("rate limited")) : fake.call(input)),
  };
  const { root, jobs, events } = setup(provider);
  try {
    const g = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "dashboard",
      target: "web-desktop",
      count: 3,
    });
    await jobs.runStep(root, g.slug, g.step.id);
    await jobs.idle();
    const state = jobs.state(`${g.slug}/${g.step.id}`)!;
    assertEquals(state.state, "error");
    assertEquals(state.errors, { "v2.html": "rate limited" });
    assertEquals((await listDesigns(root)).screens[0]!.files.map((f) => f.file).sort(), ["v1.html", "v3.html"]);
    assert(events.some((e) => e.type === "job" && e.state === "error"));
  } finally {
    cleanup(root);
  }
});

Deno.test("model output with scripts is sanitised before it is written", async () => {
  const provider: Provider = {
    id: "fake",
    label: "evil",
    call: () =>
      Promise.resolve({
        files: [{
          file: "v1.html",
          html:
            '<!doctype html><html><head><style>:root{--a:1}</style></head><body onload="x()"><script>alert(1)</script><main><img src="https://evil.example/x.png"><a href="javascript:alert(1)">go</a></main></body></html>',
        }],
      }),
  };
  const { root, jobs } = setup(provider);
  try {
    const g = await beginStep(root, {
      kind: "begin",
      step: "generate",
      name: "Evil",
      brief: "x",
      target: "web-desktop",
      count: 1,
    });
    await jobs.runStep(root, g.slug, g.step.id);
    await jobs.idle();
    const written = Deno.readTextFileSync(join(root, "design", g.slug, "v1.html"));
    assert(!/<script|onload|javascript:|evil\.example/i.test(written), written);
  } finally {
    cleanup(root);
  }
});

Deno.test("directions: DESIGN.md per direction from its seed, then one page per screen", async () => {
  const { root, jobs } = setup();
  try {
    const { beginDirections, listDirections } = await import("../design/projectDesignDirections.ts");
    await beginDirections(root, { brief: "A booking app for a small clinic", stack: "react-flutter", count: 3 });
    await jobs.runDirections(root);
    await jobs.idle();
    const view = await listDirections(root);
    assertEquals(Object.values(view.designMd), [true, true, true]);
    const statuses = Object.values(view.files).flat();
    assert(statuses.length >= 15 && statuses.every((s) => s.ok), "all screens exist and pass the gate");
  } finally {
    cleanup(root);
  }
});
