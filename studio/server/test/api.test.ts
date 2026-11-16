import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import { createApi } from "../api.ts";
import { loadEnv } from "../env.ts";
import { createFakeProvider } from "../providers/fake.ts";
import { cleanup, makeProject } from "./helpers.ts";

const PORT = 4399;
const HOST = `127.0.0.1:${PORT}`;

function setup() {
  const root = makeProject();
  const env = loadEnv([], {});
  const api = createApi({ root, env, provider: createFakeProvider(0), uiDir: null });
  const call = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
    api.handle(
      new Request(`http://${HOST}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { host: HOST, "content-type": "application/json", ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      PORT,
    );
  const design = async (command: unknown) => (await call("/api/design", { command })).json();
  return { root, api, call, design };
}

Deno.test("the server only answers its own host and refuses cross-origin posts", async () => {
  const { root, api, call } = setup();
  try {
    assertEquals((await call("/api/config")).status, 200);
    const evil = await api.handle(
      new Request(`http://evil.example:${PORT}/api/config`, { headers: { host: `evil.example:${PORT}` } }),
      PORT,
    );
    assertEquals(evil.status, 403);
    assertEquals(
      (await call("/api/design", { command: { kind: "list" } }, { origin: "http://evil.example" })).status,
      403,
    );
    assertEquals((await call("/api/design", { command: { kind: "list" } }, { origin: `http://${HOST}` })).status, 200);
  } finally {
    cleanup(root);
  }
});

Deno.test("config reports the provider, tokens, presets and the apps of the project", async () => {
  const { root, call } = setup();
  try {
    const c = await (await call("/api/config")).json();
    assertEquals(c.provider.id, "fake");
    assertEquals(c.name, "Acme Shop");
    assertEquals(c.apps.map((a: { stack: string }) => a.stack), ["web-spa", "mobile-flutter"]);
    assert(c.hasTokens && c.hasDesignMd && !c.stitch);
    assert(!JSON.stringify(c).includes("sk-"), "no key ever appears in the config");
  } finally {
    cleanup(root);
  }
});

Deno.test("end to end with the fake provider: brief, variants, edit by chat, export plan, review, write", async () => {
  const { root, api, call, design } = setup();
  try {
    const begun = await design({
      kind: "begin",
      step: "generate",
      name: "Overview",
      brief: "Sales dashboard for a small shop",
      target: "web-desktop",
      count: 2,
    });
    await api.jobs.idle();
    const list = await design({ kind: "list" });
    assertEquals(list.screens[0].files.length, 2);
    assertEquals(list.jobs[`${begun.slug}/${begun.step.id}`].state, "done");

    const refine = await design({
      kind: "begin",
      step: "refine",
      slug: begun.slug,
      parent: "v1.html",
      instruction: "Make the header sticky",
      mode: "surgical",
    });
    await api.jobs.idle();
    const html = await design({ kind: "read", slug: begun.slug, file: refine.step.files[0] });
    if (typeof html !== "string") throw new Error(JSON.stringify(html));
    assertStringIncludes(html, "sticky-top");

    // Export: lint is clean, the plan is built, nothing is written until apply.
    const exp = await (await call("/api/export/prepare", {
      slug: begun.slug,
      file: "v1.html",
      app: 0,
      feature: "sales",
      screen: "SalesScreen",
      screenshots: false,
      force: false,
    })).json();
    assertEquals(exp.blocked, []);
    assertEquals(exp.codeIssues, []);
    assertEquals(exp.plan.files.map((f: { path: string }) => f.path), [
      "apps/web/src/features/sales/ui/SalesScreen.tsx",
      "apps/web/src/features/sales/index.ts",
    ]);
    const target = join(root, "apps/web/src/features/sales/ui/SalesScreen.tsx");
    assertEquals(await Deno.stat(target).then(() => true, () => false), false);
    const applied = await (await call("/api/apply", { planId: exp.plan.id })).json();
    assertEquals(applied.written.length, 2);
    assertStringIncludes(Deno.readTextFileSync(target), "export function SalesScreen");
    assertEquals(
      Deno.readTextFileSync(join(root, "apps/web/src/features/sales/index.ts")),
      "export { SalesScreen } from './ui/SalesScreen'\n",
    );

    // Flutter target maps to lib/features/<feature>/ui/<snake>.dart
    const flutter = await (await call("/api/export/prepare", {
      slug: begun.slug,
      file: "v1.html",
      app: 1,
      feature: "sales",
      screen: "SalesScreen",
      screenshots: false,
      force: false,
    })).json();
    assertEquals(flutter.plan.files.map((f: { path: string }) => f.path), [
      "apps/mobile/lib/features/sales/presentation/sales_screen.dart",
      "apps/mobile/lib/features/sales/sales.dart",
    ]);
  } finally {
    cleanup(root);
  }
});

Deno.test("export is blocked by lint; placeholder copy can never be forced through", async () => {
  const { root, api, call, design } = setup();
  try {
    await design({ kind: "begin", step: "generate", name: "Bad", brief: "x", target: "web-desktop", count: 1 });
    await api.jobs.idle();
    const slug = "bad";
    Deno.writeTextFileSync(
      join(root, "design", slug, "v1.html"),
      "<!DOCTYPE html><html><head><style>:root{--color-primary:#000000}body{color:var(--color-primary)}</style></head><body><main><p>Lorem ipsum dolor sit amet</p></main></body></html>",
    );
    const exp = await (await call("/api/export/prepare", {
      slug,
      file: "v1.html",
      app: 0,
      feature: "bad",
      screen: "BadScreen",
      screenshots: false,
      force: false,
    })).json();
    const ids = exp.blocked.map((b: { id: string }) => b.id);
    assert(ids.includes("lorem-ipsum") && ids.includes("token-drift"), ids.join());
    assertEquals(exp.plan, null);
    const forced = await (await call("/api/export/prepare", {
      slug,
      file: "v1.html",
      app: 0,
      feature: "bad",
      screen: "BadScreen",
      screenshots: false,
      force: true,
    })).json();
    assertEquals(forced.plan, null, "lorem ipsum stays blocked even with force");
  } finally {
    cleanup(root);
  }
});

Deno.test("bad plans are rejected over HTTP and flow arrows are validated and saved in design/studio/flow.json", async () => {
  const { root, call } = setup();
  try {
    const bad = await call("/api/plan", { files: [{ path: "../x.ts", content: "x" }] });
    assertEquals(bad.status, 400);
    assertStringIncludes((await bad.json()).error, "leaves the project");
    assertEquals((await call("/api/flow", { arrows: [{ from: "a", to: "a" }] })).status, 400);
    assertEquals((await call("/api/flow", { arrows: [{ from: "../x", to: "b" }] })).status, 400);
    const saved = await (await call("/api/flow", {
      arrows: [{ from: "b", to: "c" }, { from: "a", to: "b", label: "Sign in" }, { from: "a", to: "b" }],
    })).json();
    assertEquals(saved.arrows.map((a: { from: string }) => a.from), ["a", "b"]);
    assertEquals((await (await call("/api/flow")).json()).arrows.length, 2);
    assert(Deno.readTextFileSync(join(root, "design/studio/flow.json")).endsWith("\n"));
    assertEquals((await call("/api/nope", {})).status, 404);
  } finally {
    cleanup(root);
  }
});
