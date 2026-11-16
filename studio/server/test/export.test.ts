import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "node:path";
import { readContext } from "../context.ts";
import { allowedPrefixes, createPlans, diffLines, exportPaths, guardPath, withBarrelExport } from "../export.ts";
import { lintGeneratedCode } from "../codeLint.ts";
import { cleanup, makeProject } from "./helpers.ts";

const web = { stack: "web-spa", kind: "web", dir: "apps/web", name: "web" };
const flutter = { stack: "mobile-flutter", kind: "mobile", dir: "apps/mobile", name: "mobile" };

Deno.test("export paths follow the architecture of each stack", () => {
  assertEquals(exportPaths({ app: web, kind: "react", feature: "billing", screen: "InvoiceScreen" }), {
    screen: "apps/web/src/features/billing/ui/InvoiceScreen.tsx",
    barrel: "apps/web/src/features/billing/index.ts",
  });
  assertEquals(
    exportPaths({ app: { ...web, stack: "mobile-rn", dir: "apps/app" }, kind: "react-native", feature: "notes", screen: "NoteList" })
      .screen,
    "apps/app/src/features/notes/ui/NoteList.tsx",
  );
  assertEquals(exportPaths({ app: flutter, kind: "flutter", feature: "billing", screen: "InvoiceScreen" }), {
    screen: "apps/mobile/lib/features/billing/ui/invoice_screen.dart",
    barrel: null,
  });
});

Deno.test("feature and screen names are validated before they reach a path", () => {
  assertThrows(() => exportPaths({ app: web, kind: "react", feature: "../x", screen: "A" }), Error, "Feature names");
  assertThrows(() => exportPaths({ app: web, kind: "react", feature: "Billing", screen: "A" }), Error, "Feature names");
  assertThrows(() => exportPaths({ app: web, kind: "react", feature: "billing", screen: "a/b" }), Error, "Screen names");
  assertThrows(() => exportPaths({ app: web, kind: "react", feature: "billing", screen: "lower" }), Error, "Screen names");
});

Deno.test("the write guard accepts only project-relative paths in allowed folders", () => {
  const root = makeProject();
  try {
    const prefixes = allowedPrefixes(readContext(root));
    assertEquals(
      guardPath(root, "apps/web/src/features/billing/ui/InvoiceScreen.tsx", prefixes),
      "apps/web/src/features/billing/ui/InvoiceScreen.tsx",
    );
    assertEquals(guardPath(root, "design/tokens.json", prefixes), "design/tokens.json");
    assertEquals(guardPath(root, "DESIGN.md", prefixes), "DESIGN.md");
    assertEquals(guardPath(root, "docs/screenshots/a-desktop-light.png", prefixes), "docs/screenshots/a-desktop-light.png");
    const bad = [
      "../outside.ts",
      "apps/web/../../x.ts",
      "/etc/passwd",
      "C:\\Windows\\x.ts",
      "\\\\server\\share\\x.ts",
      ".env",
      "design/.env.local",
      ".git/config",
      "apps/web/node_modules/x/index.ts",
      "apps/web/src/app.ts",
      "backend/src/main.ts",
      "apps/web/src/features/a/ui/x.sh",
      "apps/web/src/features/a/ui/x",
      "",
    ];
    for (const path of bad) assertThrows(() => guardPath(root, path, prefixes), Error, undefined, path);
  } finally {
    cleanup(root);
  }
});

Deno.test("line diff marks additions, removals and unchanged lines", () => {
  const d = diffLines("a\nb\nc", "a\nB\nc\nd");
  assertEquals(d.map((l) => l.kind + ":" + l.text), ["same:a", "del:b", "add:B", "same:c", "add:d"]);
  assertEquals(diffLines("", "x").map((l) => l.kind), ["add"]);
  assertEquals(diffLines("same", "same").every((l) => l.kind === "same"), true);
});

Deno.test("plan then apply: nothing is written by plan, apply writes exactly the plan, and only once", async () => {
  const root = makeProject();
  try {
    const plans = createPlans(() => readContext(root), root);
    const file = "apps/web/src/features/billing/ui/InvoiceScreen.tsx";
    const view = await plans.plan([{ path: file, content: "export const x = 1\n" }, { path: "design/tokens.json", content: "{}\n" }]);
    assertEquals(view.files.map((f) => f.status), ["new", "changed"]);
    assertEquals(view.files[0]!.diff.map((l) => l.kind), ["add"]);
    assertEquals(await Deno.stat(join(root, file)).then(() => true, () => false), false, "plan must not write");
    const { written } = await plans.apply(view.id);
    assertEquals(written.sort(), [file, "design/tokens.json"].sort());
    assertEquals(Deno.readTextFileSync(join(root, file)), "export const x = 1\n");
    await assertRejects(() => plans.apply(view.id), Error, "expired");
    await assertRejects(() => plans.apply("not-a-plan"), Error, "expired");
  } finally {
    cleanup(root);
  }
});

Deno.test("a plan with a bad path is refused whole, before anything is read or written", async () => {
  const root = makeProject();
  try {
    const plans = createPlans(() => readContext(root), root);
    await assertRejects(
      () => plans.plan([{ path: "design/ok.json", content: "{}" }, { path: "../escape.ts", content: "x" }]),
      Error,
      "leaves the project",
    );
    await assertRejects(() => plans.plan([]), Error, "1 to 40");
    await assertRejects(
      () => plans.plan([{ path: "design/a.json", content: "1" }, { path: "design/a.json", content: "2" }]),
      Error,
      "twice",
    );
    assertEquals(await Deno.stat(join(root, "design", "ok.json")).then(() => true, () => false), false);
  } finally {
    cleanup(root);
  }
});

Deno.test("unchanged files are skipped and CRLF is normalised to LF", async () => {
  const root = makeProject();
  try {
    const plans = createPlans(() => readContext(root), root);
    const same = Deno.readTextFileSync(join(root, "DESIGN.md"));
    const view = await plans.plan([{ path: "DESIGN.md", content: same }, { path: "design/a.json", content: "{\r\n}\r\n" }]);
    assertEquals(view.files[0]!.status, "unchanged");
    const { written } = await plans.apply(view.id);
    assertEquals(written, ["design/a.json"]);
    assertEquals(Deno.readTextFileSync(join(root, "design", "a.json")), "{\n}\n");
  } finally {
    cleanup(root);
  }
});

Deno.test("apply refuses to write through a symlinked folder", async () => {
  const root = makeProject();
  const outside = Deno.makeTempDirSync({ prefix: "studio-outside-" });
  try {
    try {
      Deno.symlinkSync(outside, join(root, "design", "linked"), { type: "dir" });
    } catch {
      return; // Symlinks need privileges on some Windows setups; the check is covered where they exist.
    }
    const plans = createPlans(() => readContext(root), root);
    const view = await plans.plan([{ path: "design/linked/x.json", content: "{}" }]);
    await assertRejects(() => plans.apply(view.id), Error);
    assertEquals(await Deno.stat(join(outside, "x.json")).then(() => true, () => false), false);
  } finally {
    cleanup(root);
    cleanup(outside);
  }
});

Deno.test("barrel exports are appended once and keep existing lines", () => {
  assertEquals(withBarrelExport(null, "A", "react"), "export { A } from './ui/A'\n");
  assertEquals(withBarrelExport("export { B } from './ui/B'\n", "A", "react"), "export { B } from './ui/B'\nexport { A } from './ui/A'\n");
  const once = withBarrelExport("export { A } from './ui/A'\n", "A", "react");
  assertEquals(once, "export { A } from './ui/A'\n");
});

Deno.test("generated code is checked for hard-coded colours, literal text, placeholders and missing states", () => {
  const good =
    "export const defaultCopy = { title: 'Hi' }\nexport function S({ state = 'ready', copy = defaultCopy }) { return <h1>{copy.title}{state === 'loading' || state === 'empty' || state === 'error'}</h1> }";
  assertEquals(lintGeneratedCode("react", good), []);
  const ids = (kind: "react" | "flutter", code: string) => lintGeneratedCode(kind, code).map((i) => i.id);
  assert(ids("react", `${good}\nconst c = '#ff0000'`).includes("hard-coded-colour"));
  assert(ids("react", `${good}\nconst x = <p>Save changes now</p>`).includes("literal-text"));
  assert(ids("react", `${good}\n// TODO later\nconst a = 1; const l = 'Lorem ipsum'`).includes("placeholder"));
  assert(ids("react", "export const S = () => null").includes("no-copy-prop"));
  assert(ids("react", `${good}\nconst c = 'p-[13px]'`).includes("arbitrary-value"));
  assert(
    ids("flutter", "class S { final copy; Widget build() { return Text('Hello world'); } } // loading empty error").includes(
      "literal-text",
    ),
  );
  assert(ids("flutter", "class S { final copy; Color c = Color(0xFF112233); } // loading empty error").includes("hard-coded-colour"));
});
