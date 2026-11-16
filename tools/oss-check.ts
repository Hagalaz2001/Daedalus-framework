// Daedalus gate for publishing: `deno task oss:check`. Fails on private names, personal paths, real-looking emails,
// third-party folders missing from THIRD_PARTY_NOTICES.md, and the Deno-only rule. Runs in CI and in `deno task check`.
import { existsSync, readFileSync } from "node:fs";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { listFiles, scanDenoOnly } from "../template/scripts/lint-deno-only.ts";
import { scanWorkflows } from "../template/scripts/lint-workflows.ts";

export const root = join(dirname(fromFileUrl(import.meta.url)), "..");

// Patterns are assembled from parts so this file does not trip its own scan (it is also skipped by path).
const BANNED_NAMES = [
  ["aether", "code"],
  ["z", "code"],
  ["kin", "ly"],
  ["bespoke", "\\s*navi"],
  ["med", "chart"],
  ["juris", "ai"],
  ["traf", "fy"],
  ["orb", "its"],
  ["had", "es"],
  ["de", "ll"],
]
  .map((p) => new RegExp(String.raw`\b${p.join("")}\b`, "i"));
const BANNED_PATHS = [
  /[A-Za-z]:[\\/]+Users[\\/]/,
  /\/Users\/(?!<|\$|you\b|name\b|me\b)[A-Za-z0-9_.-]+\//,
  /\/home\/(?!<|runner\b|user\b|\$)[A-Za-z0-9_.-]+\//,
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+(?!(?:png|jpe?g|webp|svg|ts|js|json|dart)\b)[A-Za-z]{2,}\b/g;
const EMAIL_OK = /@(example\.(com|org|net)|users\.noreply\.github\.com|localhost)$/i;

const BINARY =
  /\.(png|jpe?g|gif|webp|ico|icns|ttf|otf|woff2?|jar|zip|gz|pdf|mp4|webm|keystore|jks|bin|lockb|pbxproj)$/i;
const SKIP = [
  /^tools\/oss-check\.ts$/,
  /(^|\/)(deno\.lock|pubspec\.lock|Cargo\.lock)$/,
  /^\.git\//,
  /(^|\/)(node_modules|\.dart_tool|target|build|dist)\//,
];

/** Banned names, personal paths and real-looking emails in the given files (paths relative to `dir`). Also used on generated output. */
export function scanContent(dir: string, files: string[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    if (BINARY.test(f)) continue;
    const text = readFileSync(join(dir, f), "utf8");
    for (const r of BANNED_NAMES) if (r.test(text) || r.test(f)) out.push(`${f}: banned name /${r.source}/`);
    for (const r of BANNED_PATHS) if (r.test(text)) out.push(`${f}: personal or machine path`);
    for (const m of text.matchAll(EMAIL)) if (!EMAIL_OK.test(m[0])) out.push(`${f}: email address ${m[0]}`);
  }
  return out;
}

function main() {
  const problems: string[] = [];
  // Files git would track (ignores build output and local tool state); outside a git checkout, every file.
  const tracked = (() => {
    const r = new Deno.Command("git", {
      args: ["ls-files", "--cached", "--others", "--exclude-standard"],
      cwd: root,
      stdout: "piped",
      stderr: "null",
    }).outputSync();
    return r.success ? new Set(new TextDecoder().decode(r.stdout).split("\n").filter(Boolean)) : null;
  })();
  const files = listFiles(root).filter((f) => !tracked || tracked.has(f)).filter((f) =>
    !SKIP.some((r) => r.test(f)) && !BINARY.test(f)
  );

  problems.push(...scanContent(root, files));

  // Third-party code: every folder that carries its own LICENSE, or is named vendor / third_party / components/ui,
  // must be named in THIRD_PARTY_NOTICES.md.
  const notices = existsSync(join(root, "THIRD_PARTY_NOTICES.md"))
    ? readFileSync(join(root, "THIRD_PARTY_NOTICES.md"), "utf8")
    : "";
  if (!notices) problems.push("THIRD_PARTY_NOTICES.md is missing");
  const copiedIn = new Set<string>();
  for (const f of files) {
    const dir = dirname(f);
    const licence = /(^|\/)LICEN[CS]E[^/]*$/i.test(f) && dir !== "." && dir !== "template";
    const named = /(^|\/)(vendor|third_party)(\/|$)|(^|\/)components\/ui(\/|$)/.test(dir);
    if (licence) copiedIn.add(dir);
    else if (named) copiedIn.add(dir.replace(/^(.*?(?:vendor|third_party|components\/ui)).*$/, "$1"));
  }
  for (const d of copiedIn) {
    if (
      !notices.includes(d) && ![...notices.matchAll(/`([^`]+)`/g)].some((m) => d.startsWith(m[1].replace(/\/$/, "")))
    ) {
      problems.push(`${d}: third-party content not listed in THIRD_PARTY_NOTICES.md`);
    }
  }

  problems.push(...scanDenoOnly(root, [...SKIP, /^tools\/oss-check\.ts$/]));
  problems.push(...scanWorkflows(root), ...scanWorkflows(join(root, "template")));

  if (problems.length) {
    console.error(`oss:check failed:\n  ${problems.join("\n  ")}`);
    Deno.exit(1);
  }
  console.log(`oss:check ok (${files.length} files).`);
}

if (import.meta.main) main();
