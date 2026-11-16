// Prepares a versioned release from Conventional Commits (feat:, fix:, feat!: ...): picks the next version, moves the
// "Unreleased" notes of CHANGELOG.md into a dated section, and PRINTS the git commands to run. It never commits, tags or
// pushes: you read the diff first. Pushing the tag starts .github/workflows/release.yml.
//   deno task release                 next version from the commits since the last tag
//   deno task release --bump minor    force major | minor | patch
//   deno task release --dry-run       show the section, change nothing
//   deno run -A scripts/release.ts --notes v1.2.0    print that version's notes (used by the release workflow)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { runArgs } from "./lib/exec.ts";

export type Level = "major" | "minor" | "patch";
const GROUPS: [string, string][] = [["feat", "Features"], ["fix", "Fixes"], ["perf", "Performance"], [
  "security",
  "Security",
]];

export interface Commit {
  type: string;
  subject: string;
  breaking: boolean;
}

/** Parses `type(scope)!: subject` lines; anything else (merge commits, free text) is ignored. */
export function parseCommit(message: string): Commit | null {
  const m = /^(\w+)(?:\([^)]*\))?(!)?:\s+(.+)/.exec(message.split("\n")[0]);
  if (!m) return null;
  return { type: m[1].toLowerCase(), subject: m[3].trim(), breaking: !!m[2] || /^BREAKING[ -]CHANGE:/m.test(message) };
}

export function levelFor(commits: Commit[]): Level | null {
  if (commits.some((c) => c.breaking)) return "major";
  if (commits.some((c) => c.type === "feat")) return "minor";
  if (commits.some((c) => GROUPS.some(([t]) => t === c.type))) return "patch";
  return null;
}

/** Before 1.0.0 a breaking change bumps the minor, as semver allows. */
export function nextVersion(current: string, level: Level): string {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`Not a version: ${current}`);
  let [major, minor, patch] = [+m[1], +m[2], +m[3]];
  if (major === 0 && level === "major") level = "minor";
  if (level === "major") [major, minor, patch] = [major + 1, 0, 0];
  else if (level === "minor") [minor, patch] = [minor + 1, 0];
  else patch += 1;
  return `v${major}.${minor}.${patch}`;
}

export function renderSection(version: string, date: string, commits: Commit[], manual: string): string {
  const lines = [`## ${version} - ${date}`, ""];
  const breaking = commits.filter((c) => c.breaking);
  if (breaking.length) lines.push("### Breaking changes", ...breaking.map((c) => `- ${c.subject}`), "");
  for (const [type, title] of GROUPS) {
    const list = commits.filter((c) => c.type === type);
    if (list.length) lines.push(`### ${title}`, ...list.map((c) => `- ${c.subject}`), "");
  }
  if (manual.trim()) lines.push(manual.trim(), "");
  return lines.join("\n");
}

/** Moves the text under "## Unreleased" into a new dated section and leaves an empty Unreleased heading. */
export function updateChangelog(changelog: string, version: string, date: string, commits: Commit[]): string {
  const m = /^## Unreleased[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(changelog);
  if (!m) throw new Error('CHANGELOG.md has no "## Unreleased" heading');
  const section = renderSection(version, date, commits, m[1]);
  return changelog.replace(m[0], () => `## Unreleased\n\n${section}\n`);
}

/** The notes of one released version (text between its heading and the next one). */
export function notesFor(changelog: string, version: string): string {
  const esc = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^## ${esc}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(changelog);
  return m ? m[1].trim() : `Release ${version}`;
}

const git = (...args: string[]) => {
  const r = runArgs("git", args, { capture: true });
  return r.ok ? r.stdout.trim() : "";
};

if (import.meta.main) {
  const args = Deno.args;
  const flag = (n: string) => args[args.indexOf(`--${n}`) + 1];
  const file = "CHANGELOG.md";
  if (!existsSync(file)) {
    console.error("CHANGELOG.md not found. Run this from the project root.");
    Deno.exit(2);
  }
  const changelog = readFileSync(file, "utf8");
  if (args.includes("--notes")) {
    console.log(notesFor(changelog, flag("notes")));
    Deno.exit(0);
  }
  const last = git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*");
  const log = git("log", "--format=%B%x1e", last ? `${last}..HEAD` : "HEAD");
  const commits = log.split("\x1e").map((c) => parseCommit(c.trim())).filter((c): c is Commit => !!c);
  const forced = args.includes("--bump") ? (flag("bump") as Level) : undefined;
  if (forced && !["major", "minor", "patch"].includes(forced)) {
    console.error("--bump must be major, minor or patch");
    Deno.exit(2);
  }
  const level = forced ?? levelFor(commits);
  if (!level) {
    console.error(
      `No releasable commits since ${last || "the start"} (need feat:, fix:, perf: or security:). Nothing to do.`,
    );
    Deno.exit(0);
  }
  const version = nextVersion(last || "v0.0.0", level);
  const updated = updateChangelog(changelog, version, new Date().toISOString().slice(0, 10), commits);
  if (args.includes("--dry-run")) console.log(notesFor(updated, version));
  else {
    writeFileSync(file, updated);
    console.log(
      `CHANGELOG.md updated for ${version} (${commits.length} commits since ${
        last || "the start"
      }). Review it, then run:\n`,
    );
    console.log(`  git add CHANGELOG.md`);
    console.log(`  git commit -m "chore(release): ${version}"`);
    console.log(`  git tag -a ${version} -m "${version}"`);
    console.log(`  git push origin HEAD ${version}\n`);
    console.log("Pushing the tag starts the release workflow (artifacts, provenance, GitHub release).");
  }
}
