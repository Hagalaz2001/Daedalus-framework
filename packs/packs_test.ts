// deno-lint-ignore-file no-import-prefix
// Validates every packs/<name>/pack.json against the schema documented in packs/README.md, and that the files a pack
// says it adds exist, do not collide with the template or with another pack, and parse (JSON, YAML).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { parse as parseYaml } from "jsr:@std/yaml@1";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const template = join(root, "..", "template");
const STATUS = ["full", "starter"];
const KEYS = new Set([
  "name",
  "status",
  "description",
  "default",
  "stacks",
  "files",
  "rules",
  "requires",
  "tasks",
  "workspace",
  "install",
  "sync",
  "check",
  "adds",
]);

const packs = readdirSync(root).filter((d) => existsSync(join(root, d, "pack.json"))).sort();
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const cmdOk = (c: unknown) =>
  typeof c === "string" || (typeof c === "object" && c !== null && typeof (c as { run?: unknown }).run === "string");

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    if (["__pycache__", ".venv", "target", "node_modules", "build"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

Deno.test("there are packs", () => {
  assert(packs.length >= 8, `found ${packs.join(", ")}`);
  for (const must of ["ai-kit", "fintech", "healthcare", "systems", "data-ml", "infra", "game"]) {
    assert(packs.includes(must), `${must} missing`);
  }
});

for (const name of packs) {
  Deno.test(`pack ${name}: schema`, () => {
    const dir = join(root, name);
    const p = read(join(dir, "pack.json"));
    assertEquals(p.name, name);
    assert(STATUS.includes(p.status), `status must be one of ${STATUS}`);
    assert(typeof p.description === "string" && p.description.length > 20, "description");
    assert(Array.isArray(p.stacks) && p.stacks.every((s: unknown) => typeof s === "string"), "stacks");
    for (const k of Object.keys(p)) assert(KEYS.has(k), `unknown key ${k}`);
    assert(existsSync(join(dir, "README.md")) || name === "ai-kit", "README.md");
    const filesDir = join(dir, p.files ?? "files");
    assert(existsSync(filesDir), "files folder");
    if (p.rules) assert(existsSync(join(dir, p.rules)), "rules file");
    for (const [k, c] of Object.entries(p.tasks ?? {})) assert(cmdOk(c), `task ${k}`);
    for (const k of ["install", "sync", "check"]) for (const c of p[k] ?? []) assert(cmdOk(c), `${k} entry`);
    if (p.requires) {
      for (const k of Object.keys(p.requires)) assert(["backend", "stacks", "modules"].includes(k), `requires.${k}`);
    }
    const adds = p.adds ?? {};
    for (const f of adds.files ?? []) assert(existsSync(join(filesDir, f)), `adds.files: ${f} does not exist`);
    for (const s of adds.skills ?? []) {
      assert(existsSync(join(filesDir, ".claude/skills", s, "SKILL.md")), `skill ${s}`);
    }
    for (const a of adds.agents ?? []) assert(existsSync(join(filesDir, ".claude/agents", `${a}.md`)), `agent ${a}`);
    for (const c of adds.checks ?? []) assert(c in (p.tasks ?? {}), `adds.checks ${c} is not a task`);
  });

  Deno.test(`pack ${name}: files do not overwrite the template, parse, and carry no secrets`, () => {
    const p = read(join(root, name, "pack.json"));
    const filesDir = join(root, name, p.files ?? "files");
    for (const f of walk(filesDir)) {
      const rel = relative(filesDir, f).replaceAll("\\", "/");
      assert(
        !existsSync(join(template, rel)),
        `${name}/${rel} would overwrite a template file (an overlay never overwrites)`,
      );
      if (rel.endsWith(".json")) read(f);
      if (/\.ya?ml$/.test(rel) && !rel.includes("helm/")) parseYaml(readFileSync(f, "utf8"));
      assert(!/(^|\/)\.env(\.|$)(?!example)/.test(rel), `${rel} looks like a secrets file`);
    }
  });
}

Deno.test("packs do not collide with each other", () => {
  const seen = new Map<string, string>();
  for (const name of packs) {
    const p = read(join(root, name, "pack.json"));
    const filesDir = join(root, name, p.files ?? "files");
    for (const f of walk(filesDir)) {
      const rel = relative(filesDir, f).replaceAll("\\", "/");
      assert(!seen.has(rel), `${rel} is in both ${seen.get(rel)} and ${name}`);
      seen.set(rel, name);
    }
  }
});

Deno.test("task names do not collide between packs", () => {
  const seen = new Map<string, string>();
  for (const name of packs) {
    for (const t of Object.keys(read(join(root, name, "pack.json")).tasks ?? {})) {
      assert(!seen.has(t), `task ${t} is defined by ${seen.get(t)} and ${name}`);
      seen.set(t, name);
    }
  }
});
