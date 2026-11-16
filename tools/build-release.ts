// Builds the release files in dist/ (run by .github/workflows/release.yml; works locally too):
//   deno run -A tools/build-release.ts assets [--embed]   daedalus-assets-v<ver>.tar.gz (+ VERSION); --embed writes its
//                                                          SHA-256 into lib/embedded-checksums.ts for the binaries and the package
//   deno run -A tools/build-release.ts binaries [target]  deno compile for windows-x64 macos-arm64 macos-x64 linux-x64 linux-arm64
//   deno run -A tools/build-release.ts checksums          checksums.txt over every file in dist/ (and copies install.ps1/install.sh)
//   deno run -A tools/build-release.ts all [--embed]
// Nothing here publishes or uploads anything.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fromFileUrl } from "jsr:@std/path@1";
import { TarStream, type TarStreamInput } from "jsr:@std/tar@0.1.10/tar-stream";
import { assetsTarball, sha256Hex } from "../lib/assets.ts";
import { VERSION } from "../lib/version.ts";

export const root: string = join(dirname(fromFileUrl(import.meta.url)), "..");

/** Release suffix -> deno compile target. The binary embeds only the CLI; the asset tarball carries everything else. */
export const TARGETS: Record<string, string> = {
  "windows-x64": "x86_64-pc-windows-msvc",
  "macos-arm64": "aarch64-apple-darwin",
  "macos-x64": "x86_64-apple-darwin",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "linux-arm64": "aarch64-unknown-linux-gnu",
};

const TOP_FILES = [
  "VERSION",
  "deno.json",
  "deno.lock",
  "cli.ts",
  "mcp.ts",
  "new-project.ts",
  "CATALOG.md",
  "DISCLAIMER.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
];
const TOP_DIRS = ["lib", "template", "stacks", "modules", "dbs", "packs", "studio", "docs"];
/** Left out of the tarball: tests of the CLI itself, and the checksum file (it would have to contain its own hash). */
const EXCLUDE = [
  /^lib\/.*_test\.ts$/,
  /^lib\/embedded-checksums\.ts$/,
  /(^|\/)(node_modules|\.deno|dist|target|build)\//,
];

/** Files git would track, relative with `/`; outside a git checkout, a plain walk. */
function listTracked(dir: string): string[] {
  const r = new Deno.Command("git", {
    args: ["ls-files", "--cached", "--others", "--exclude-standard"],
    cwd: dir,
    stdout: "piped",
    stderr: "null",
  }).outputSync();
  if (r.success) return new TextDecoder().decode(r.stdout).split("\n").filter(Boolean);
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk("");
  return out;
}

/** Files that go into the assets tarball, sorted. */
export function assetFiles(dir: string = root): string[] {
  return listTracked(dir)
    .filter((f) => existsSync(join(dir, f)) && statSync(join(dir, f)).isFile())
    .filter((f) => TOP_FILES.includes(f) || TOP_DIRS.some((d) => f.startsWith(`${d}/`)))
    .filter((f) => !EXCLUDE.some((r) => r.test(f)))
    .sort();
}

/** Writes `<out>/daedalus-assets-v<version>.tar.gz` and `<out>/VERSION`; returns the tarball path and its SHA-256. */
export async function buildAssets(
  out: string,
  version: string = VERSION,
  dir: string = root,
): Promise<{ file: string; sha256: string }> {
  mkdirSync(out, { recursive: true });
  const files = assetFiles(dir);
  async function* inputs(): AsyncGenerator<TarStreamInput> {
    for (const f of files) {
      const p = join(dir, f);
      yield {
        type: "file",
        path: f,
        size: statSync(p).size,
        readable: (await Deno.open(p)).readable,
        options: { mode: 0o644, mtime: 0 },
      };
    }
  }
  const file = join(out, assetsTarball(version));
  const gz = ReadableStream.from(inputs()).pipeThrough(new TarStream()).pipeThrough(new CompressionStream("gzip"));
  const target = await Deno.open(file, { write: true, create: true, truncate: true });
  await gz.pipeTo(target.writable);
  writeFileSync(join(out, "VERSION"), `${version}\n`);
  return { file, sha256: await sha256Hex(readFileSync(file)) };
}

/** `sha256sum`-style checksums.txt for every file in `out` (except itself). */
export async function writeChecksums(out: string): Promise<string> {
  const lines: string[] = [];
  for (const name of readdirSync(out).sort()) {
    if (name === "checksums.txt" || !statSync(join(out, name)).isFile()) continue;
    lines.push(`${await sha256Hex(readFileSync(join(out, name)))}  ${name}`);
  }
  const f = join(out, "checksums.txt");
  writeFileSync(f, lines.join("\n") + "\n");
  return f;
}

/** deno compile for one target name from TARGETS. */
export function compile(out: string, name: string, dir: string = root): string {
  const target = TARGETS[name];
  if (!target) throw new Error(`Unknown target ${name}. Choose: ${Object.keys(TARGETS).join(", ")}`);
  mkdirSync(out, { recursive: true });
  const file = join(out, `daedalus-${name}${name.startsWith("windows") ? ".exe" : ""}`);
  const r = new Deno.Command(Deno.execPath(), {
    args: ["compile", "-A", "--target", target, "--output", file, "cli.ts"],
    cwd: dir,
    stdout: "inherit",
    stderr: "inherit",
  }).outputSync();
  if (!r.success) throw new Error(`deno compile failed for ${name}`);
  return file;
}

async function main(args: string[]) {
  const [cmd, ...rest] = args;
  const out = join(root, "dist");
  const embed = rest.includes("--embed");
  const doAssets = async () => {
    const { file, sha256 } = await buildAssets(out);
    console.log(`${file}\n  sha256 ${sha256}`);
    if (embed) {
      const f = join(root, "lib/embedded-checksums.ts");
      writeFileSync(
        f,
        readFileSync(f, "utf8").replace(
          /EMBEDDED_SHA256: Record<string, string> = \{[^}]*\}/,
          `EMBEDDED_SHA256: Record<string, string> = { "${VERSION}": "${sha256}" }`,
        ),
      );
      console.log("embedded the checksum in lib/embedded-checksums.ts");
    }
  };
  const doBinaries = (only?: string) => {
    for (const n of only ? [only] : Object.keys(TARGETS)) console.log(compile(out, n));
  };
  const doChecksums = async () => {
    for (const f of ["install.ps1", "install.sh"]) copyFileSync(join(root, f), join(out, f));
    console.log(await writeChecksums(out));
  };
  if (cmd === "assets") await doAssets();
  else if (cmd === "binaries") doBinaries(rest.find((a) => !a.startsWith("--")));
  else if (cmd === "checksums") await doChecksums();
  else if (cmd === "all") {
    await doAssets();
    doBinaries();
    await doChecksums();
  } else {
    console.error("Usage: build-release.ts assets [--embed] | binaries [target] | checksums | all [--embed]");
    Deno.exit(2);
  }
}

if (import.meta.main) await main(Deno.args);
