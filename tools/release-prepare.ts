// `deno task release:prepare <version>`: bumps VERSION (and the copies in deno.json and lib/version.ts), adds the commits
// since the last tag to CHANGELOG.md, then PRINTS the git commands to tag and push. It never commits, tags or pushes.
//   deno task release:prepare 2.1.0
//   deno run -A tools/release-prepare.ts notes 2.1.0     prints that version's CHANGELOG section (used for the release page)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fromFileUrl } from "jsr:@std/path@1";

const root = join(dirname(fromFileUrl(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+$/;

const SECTIONS: [string, string][] = [
  ["breaking", "Breaking changes"],
  ["feat", "Added"],
  ["fix", "Fixed"],
  ["perf", "Changed"],
  ["refactor", "Changed"],
  ["docs", "Documentation"],
];

/** Release-note sections from conventional-commit subjects (`feat(scope): text`, `fix!: text`). Other types are left out. */
export function groupCommits(subjects: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of subjects) {
    const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(s.trim());
    if (!m) continue;
    const [, type, scope, bang, text] = m;
    const title = bang ? "Breaking changes" : SECTIONS.find(([t]) => t === type)?.[1];
    if (!title) continue;
    const line = `- ${scope ? `${scope}: ` : ""}${text}`;
    out.set(title, [...(out.get(title) ?? []), line]);
  }
  return new Map([...out].sort((a, b) => order(a[0]) - order(b[0])));
}
const order = (t: string) => Math.max(0, SECTIONS.findIndex(([, title]) => title === t));

/** CHANGELOG.md text with `version` dated today. A hand-written "(unreleased)" entry is kept and only renamed. */
export function updateChangelog(text: string, version: string, date: string, subjects: string[]): string {
  const unreleased = new RegExp(String.raw`^## ${version.replace(/\./g, "\\.")} \(unreleased\)[ \t]*$`, "m");
  if (unreleased.test(text)) return text.replace(unreleased, `## ${version} (${date})`);
  if (new RegExp(`^## ${version.replace(/\./g, "\\.")} \\(`, "m").test(text)) return text; // already there
  const groups = groupCommits(subjects);
  const body = [...groups].map(([title, lines]) => `### ${title}\n\n${lines.join("\n")}`).join("\n\n") ||
    "No user-facing changes.";
  const entry = `## ${version} (${date})\n\n${body}\n\n`;
  const first = text.search(/^## /m);
  return first < 0 ? `${text.trimEnd()}\n\n${entry}` : `${text.slice(0, first)}${entry}${text.slice(first)}`;
}

/** The CHANGELOG section of one version (heading excluded); undefined when absent. */
export function sectionOf(text: string, version: string): string | undefined {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## ${version} `) || l === `## ${version}`);
  if (start < 0) return undefined;
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

function git(args: string[]): string | undefined {
  const r = new Deno.Command("git", { args, cwd: root, stdout: "piped", stderr: "null" }).outputSync();
  return r.success ? new TextDecoder().decode(r.stdout).trim() : undefined;
}

function main(args: string[]): number {
  if (args[0] === "notes") {
    const s = sectionOf(readFileSync(join(root, "CHANGELOG.md"), "utf8"), args[1] ?? "");
    if (s === undefined) {
      console.error(`CHANGELOG.md has no section for ${args[1]}`);
      return 1;
    }
    console.log(s);
    return 0;
  }
  const version = args[0]?.replace(/^v/, "");
  if (!version || !SEMVER.test(version)) {
    console.error("Usage: deno task release:prepare <X.Y.Z>");
    return 2;
  }
  const current = readFileSync(join(root, "VERSION"), "utf8").trim();
  if (version !== current && !newer(version, current)) {
    console.error(`${version} is not newer than the current version ${current}.`);
    return 2;
  }
  const lastTag = git(["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  const subjects = (git(["log", "--no-merges", "--pretty=%s", ...(lastTag ? [`${lastTag}..HEAD`] : [])]) ?? "")
    .split("\n").filter(Boolean);

  const write = (file: string, fn: (t: string) => string) => {
    const p = join(root, file);
    writeFileSync(p, fn(readFileSync(p, "utf8")));
  };
  writeFileSync(join(root, "VERSION"), `${version}\n`);
  write("deno.json", (t) => t.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));
  write("lib/version.ts", (t) => t.replace(/VERSION = "[^"]+"/, `VERSION = "${version}"`));
  write("CHANGELOG.md", (t) => updateChangelog(t, version, new Date().toISOString().slice(0, 10), subjects));

  console.log(`Prepared ${version} (${subjects.length} commits since ${lastTag ?? "the start"}).
Review the diff and CHANGELOG.md, then run these yourself (nothing here was committed, tagged or pushed):

  git add VERSION deno.json lib/version.ts CHANGELOG.md
  git commit -m "chore(release): v${version}"
  git tag -s v${version} -m "v${version}"     # or: git tag -a v${version} -m "v${version}"
  git push origin main
  git push origin v${version}                 # pushing the tag starts .github/workflows/release.yml`);
  return 0;
}

if (import.meta.main) Deno.exit(main(Deno.args));
