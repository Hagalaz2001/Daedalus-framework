// Enforces the toolchain rule: every JS/TS part is pure Deno (deno.json workspaces + deno.lock).
// Fails on npm/pnpm/yarn lockfiles and on npm, npx, pnpm or yarn commands in scripts, docs, CI and Dockerfiles.
// Also enforces exact versions (no ^, ~ or ranges) for the framework packages in PINNED.
// `npm:` specifiers in Deno imports and dependency lists in package.json are fine. A line containing
// `deno-only:allow` is skipped (for text that must quote a forbidden command).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FORBIDDEN_FILES = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)npm-shrinkwrap\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)pnpm-workspace\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)\.yarnrc(\.yml)?$/,
  /(^|\/)bun\.lockb?$/,
];

const TEXT = /(\.(md|mdx|ts|tsx|js|mjs|cjs|json|ya?ml|sh|toml)|(^|\/)Dockerfile[^/]*)$/i;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".dart_tool", "target", ".next", ".expo", ".deno"]);
const SKIP_FILES = /(^|\/)(deno\.lock|pubspec\.lock|Cargo\.lock|schema\.d\.ts)$/;

const COMMAND = new RegExp(
  "(?:^|[`\"'(;&|]|\\$\\s|&&\\s|run:\\s|RUN\\s)\\s*(?:npx\\s+\\S|(?:npm|pnpm|yarn)\\s+" +
    "(?:install|i|ci|run|exec|add|init|create|start|test|build|dlx|publish|update|upgrade|link|remove|rm|uninstall|-g|--global)\\b)",
);

export function findNpmCommands(text: string): { line: number; text: string }[] {
  return text.split("\n").flatMap((t, i) => (t.includes("deno-only:allow") || !COMMAND.test(t) ? [] : [{ line: i + 1, text: t.trim() }]));
}

/** Frameworks whose versions must be exact: an unreviewed minor bump of these changes the whole app. */
export const PINNED = ["next", "astro", "react", "react-dom", "vue", "hono", "better-auth"];

/** Returns "name@range" for every pinned framework declared with a range in a package.json text. */
export function findUnpinned(packageJson: string): string[] {
  let pkg: Record<string, Record<string, string> | undefined>;
  try {
    pkg = JSON.parse(packageJson);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const group of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const [name, range] of Object.entries(pkg[group] ?? {})) {
      if (PINNED.includes(name) && /^[\^~<>*]|\bx\b|latest/.test(range) && !range.startsWith("workspace:")) out.push(`${name}@${range}`);
    }
  }
  return out;
}

export function listFiles(root: string, rel = ""): string[] {
  return readdirSync(join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : listFiles(root, r);
    return [r];
  });
}

/** Returns one message per violation under `root`. `ignore` lists relative paths that may quote forbidden text. */
export function scanDenoOnly(root: string, ignore: RegExp[] = []): string[] {
  const problems: string[] = [];
  for (const f of listFiles(root)) {
    if (ignore.some((r) => r.test(f))) continue;
    if (FORBIDDEN_FILES.some((r) => r.test(f))) problems.push(`${f}: npm/pnpm/yarn file; use deno.json and deno.lock`);
    else if (TEXT.test(f) && !SKIP_FILES.test(f)) {
      if (/(^|\/)package\.json$/.test(f)) {
        for (const u of findUnpinned(readFileSync(join(root, f), "utf8"))) problems.push(`${f}: ${u} must be an exact version (no ^, ~ or range)`);
      }
      for (const h of findNpmCommands(readFileSync(join(root, f), "utf8"))) {
        problems.push(`${f}:${h.line}: npm-family command (${h.text.slice(0, 80)}); use deno install / deno task / deno run`);
      }
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = scanDenoOnly(".");
  if (problems.length) {
    console.error(`Deno-only rule violated:\n  ${problems.join("\n  ")}`);
    Deno.exit(1);
  }
  console.log("Deno-only ok.");
}
