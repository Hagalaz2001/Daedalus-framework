// Spec helper: `deno task spec:new|plan|tasks|check`. Files live in specs/NNN-slug/, templates in specs/templates/.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// A marker in backticks is documentation, not an open question.
const UNRESOLVED = /(?<!`)\[NEEDS CLARIFICATION/i;
const AC = /^- (AC-\d+):\s*(.+)$/gm;

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
const template = (root: string, name: string) => {
  const f = join(root, "specs/templates", `${name}.md`);
  if (!existsSync(f)) throw new Error(`missing template ${f}`);
  return readFileSync(f, "utf8");
};

export const specDirs = (root: string): string[] =>
  existsSync(join(root, "specs")) ? readdirSync(join(root, "specs")).filter((d) => /^\d{3}-/.test(d)).sort() : [];

export function resolveSpec(root: string, key: string): string {
  const hit = specDirs(root).filter((d) => d === key || d.startsWith(`${key}-`) || d.slice(4) === key);
  if (hit.length !== 1) {
    throw new Error(
      `spec "${key}" ${hit.length ? "is ambiguous" : "not found"} (have: ${specDirs(root).join(", ") || "none"})`,
    );
  }
  return hit[0];
}

export function newSpec(root: string, slug: string, title = slug.replaceAll("-", " ")): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("slug: lowercase letters, digits and - only");
  if (specDirs(root).some((d) => d.slice(4) === slug)) throw new Error(`a spec named ${slug} already exists`);
  const n = Math.max(0, ...specDirs(root).map((d) => Number(d.slice(0, 3)))) + 1;
  const id = String(n).padStart(3, "0");
  const dir = `${id}-${slug}`;
  mkdirSync(join(root, "specs", dir), { recursive: true });
  const vars = { id, title, date: new Date().toISOString().slice(0, 10) };
  for (const f of ["spec", "acceptance"]) {
    writeFileSync(join(root, "specs", dir, `${f}.md`), fill(template(root, f), vars));
  }
  return dir;
}

const read = (root: string, dir: string, f: string) => {
  const p = join(root, "specs", dir, f);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
};

export function criteria(root: string, dir: string): { id: string; text: string }[] {
  return [...read(root, dir, "acceptance.md").matchAll(AC)].map((m) => ({ id: m[1], text: m[2] })).filter((c) =>
    !c.text.includes("...")
  );
}

function requireReady(root: string, dir: string) {
  const spec = read(root, dir, "spec.md");
  if (!spec) throw new Error(`${dir}/spec.md is missing`);
  if (UNRESOLVED.test(spec) || UNRESOLVED.test(read(root, dir, "acceptance.md"))) {
    throw new Error(`${dir} still has [NEEDS CLARIFICATION] markers: resolve them with the owner first`);
  }
}

export function newPlan(root: string, key: string): string {
  const dir = resolveSpec(root, key);
  requireReady(root, dir);
  const out = join(root, "specs", dir, "plan.md");
  if (existsSync(out)) throw new Error(`${dir}/plan.md already exists`);
  writeFileSync(out, fill(template(root, "plan"), { id: dir.slice(0, 3), title: dir.slice(4).replaceAll("-", " ") }));
  return out;
}

export function newTasks(root: string, key: string): string {
  const dir = resolveSpec(root, key);
  requireReady(root, dir);
  if (!read(root, dir, "plan.md")) throw new Error(`${dir}/plan.md is missing: run spec:plan first`);
  const acs = criteria(root, dir);
  if (!acs.length) throw new Error(`${dir}/acceptance.md has no "- AC-n:" lines`);
  const tasks = acs.map((c, i) => `- [ ] T-${i + 1}: test first, then implement ${c.id}: ${c.text}`).join("\n");
  const out = join(root, "specs", dir, "tasks.md");
  if (existsSync(out)) throw new Error(`${dir}/tasks.md already exists`);
  writeFileSync(
    out,
    fill(template(root, "tasks"), { id: dir.slice(0, 3), title: dir.slice(4).replaceAll("-", " "), tasks }),
  );
  return out;
}

/** Returns problems; empty means every spec is consistent. */
export function checkSpecs(root: string): string[] {
  const problems: string[] = [];
  for (const d of specDirs(root)) {
    for (const f of ["spec.md", "acceptance.md"]) if (!read(root, d, f)) problems.push(`${d}: ${f} is missing`);
    const approved = /^Status:\s*(approved|implemented)/mi.test(read(root, d, "spec.md"));
    if (read(root, d, "plan.md") && !approved) problems.push(`${d}: has a plan but the spec is not approved`);
    if ((read(root, d, "plan.md") || read(root, d, "tasks.md")) && UNRESOLVED.test(read(root, d, "spec.md"))) {
      problems.push(`${d}: [NEEDS CLARIFICATION] left in an approved spec`);
    }
    const tasks = read(root, d, "tasks.md");
    if (tasks) {
      for (const c of criteria(root, d)) if (!tasks.includes(c.id)) problems.push(`${d}: ${c.id} has no task`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const [cmd, key, ...title] = Deno.args;
  const root = Deno.cwd();
  try {
    if (cmd === "new" && key) console.log(`created specs/${newSpec(root, key, title.join(" ") || undefined)}`);
    else if (cmd === "plan" && key) console.log(`created ${newPlan(root, key)}`);
    else if (cmd === "tasks" && key) console.log(`created ${newTasks(root, key)}`);
    else if (cmd === "check") {
      const p = checkSpecs(root);
      p.forEach((x) => console.error(x));
      Deno.exit(p.length ? 1 : 0);
    } else {
      console.error("usage: spec.ts new <slug> [title] | plan <id|slug> | tasks <id|slug> | check");
      Deno.exit(2);
    }
  } catch (e) {
    console.error((e as Error).message);
    Deno.exit(1);
  }
}
