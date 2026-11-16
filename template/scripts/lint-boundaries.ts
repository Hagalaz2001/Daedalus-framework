// Architecture rule, enforced: a feature may import another feature only through its public entry, and shared code
// never imports features. Part of `deno task check`; see docs/ARCHITECTURE.md.
//   TypeScript: features/<name>/index.ts(x) is the public entry.   Dart: features/<name>/<name>.dart is the barrel.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

export type Lang = "ts" | "dart";
const SHARED = new Set(["shared", "core"]);
const SKIP = new Set(["node_modules", "dist", "build", ".dart_tool", ".next", ".expo", "target"]);

const IMPORT_RE: Record<Lang, RegExp> = {
  ts: /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g,
  dart: /\b(?:import|export)\s+['"]([^'"]+)['"]/g,
};

/** Splits a path relative to the source root into feature name and the rest inside it. */
function inFeature(rel: string): { feature: string; rest: string } | null {
  const m = /^(?:.*\/)?features\/([^/]+)(?:\/(.*))?$/.exec(rel);
  return m ? { feature: m[1], rest: m[2] ?? "" } : null;
}

/** Turns an import specifier into a path relative to the source root, or null for external packages. */
function resolveSpec(lang: Lang, fileRel: string, spec: string): string | null {
  // Dart treats any import that is not dart: or package: as relative to the importing file.
  if (spec.startsWith(".") || (lang === "dart" && !/^(dart|package):/.test(spec))) return posix.normalize(posix.join(posix.dirname(fileRel), spec));
  if (lang === "ts" && /^[@~]\//.test(spec)) return spec.slice(2);
  if (lang === "dart") {
    const m = /^package:[^/]+\/(.+)$/.exec(spec);
    if (m) return m[1];
  }
  return null;
}

const isPublicEntry = (lang: Lang, feature: string, rest: string) =>
  lang === "ts" ? /^(index(\.[cm]?[jt]sx?)?)?$/.test(rest) : rest === `${feature}.dart`;

/** Returns one message per violating import in a file. `fileRel` is relative to the app's source root, POSIX style. */
export function findViolations(lang: Lang, fileRel: string, text: string): string[] {
  const own = inFeature(fileRel)?.feature;
  const zone = fileRel.split("/")[0];
  const out: string[] = [];
  for (const m of text.matchAll(IMPORT_RE[lang])) {
    const target = resolveSpec(lang, fileRel, m[1]);
    const t = target && inFeature(target);
    if (!t) continue;
    if (SHARED.has(zone)) out.push(`${fileRel}: shared code must not import a feature ("${m[1]}")`);
    else if (t.feature !== own && !isPublicEntry(lang, t.feature, t.rest)) {
      out.push(`${fileRel}: imports internals of feature "${t.feature}" ("${m[1]}"); use its public entry`);
    }
  }
  return out;
}

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p, ext) : ext.test(e.name) ? [p] : [];
  });
}

if (import.meta.main) {
  const manifest = JSON.parse(readFileSync(".blueprint.json", "utf8")) as {
    apps: { dir: string; boundaries?: { lang: Lang; src: string } }[];
  };
  const problems: string[] = [];
  let scanned = 0;
  for (const app of manifest.apps) {
    if (!app.boundaries) continue;
    const root = join(app.dir, app.boundaries.src);
    if (!existsSync(root)) continue;
    const ext = app.boundaries.lang === "ts" ? /\.(m|c)?[jt]sx?$/ : /\.dart$/;
    for (const f of files(root, ext)) {
      scanned++;
      const rel = f.slice(root.length + 1).split("\\").join("/");
      problems.push(...findViolations(app.boundaries.lang, rel, readFileSync(f, "utf8")).map((p) => `${root.split("\\").join("/")}/${p}`));
    }
  }
  if (problems.length) {
    console.error(`Boundary violations:\n  ${problems.join("\n  ")}`);
    Deno.exit(1);
  }
  console.log(`Boundaries ok (${scanned} files).`);
}
