// TEMPORARY: runs React Native native builds (expo export) with the OFFICIAL Deno 2.9.6 binary while newer Deno releases
// are affected by a child_process / worker regression (denoland/deno#37040; PR #37080 only fixes part of it, see
// tools/deno-patched/README.md in the Daedalus checkout). Deno 2.9.6 exports reliably.
// Usage: deno run -A scripts/native-deno.ts [--cwd <appDir>] <task>     e.g. export:android
//        deno run -A scripts/native-deno.ts --status [--json] | --install
// Delete this file (and the build:android / build:ios tasks that call it) once a fixed Deno is released.
import { dirname, join } from "jsr:@std/path@1";

export const PINNED = "2.9.6";
export const FIRST_AFFECTED = "2.9.7";
/** First release that fixes the regression. null = none yet; set it (e.g. "2.9.12") when upstream ships. */
export const AFFECTED_UNTIL: string | null = null;

// SHA-256 of the official release zips (https://github.com/denoland/deno/releases/tag/v2.9.6, *.zip.sha256sum files).
export const ASSETS: Record<string, { file: string; sha256: string }> = {
  "windows-x86_64": {
    file: "deno-x86_64-pc-windows-msvc.zip",
    sha256: "15e5300b0ba3c3695a7621d90160a746ec9e710228cee639afa9d580f6e3cd11",
  },
  "darwin-aarch64": {
    file: "deno-aarch64-apple-darwin.zip",
    sha256: "213a2f304f04d3c9cb5220669afad138f60a5aab1fe80962abdeb8f35807a472",
  },
  "darwin-x86_64": {
    file: "deno-x86_64-apple-darwin.zip",
    sha256: "7d4524b82bcc557fe020a1a5b56956ed42b992ae5b28026e8ad5d17329533f5f",
  },
  "linux-x86_64": {
    file: "deno-x86_64-unknown-linux-gnu.zip",
    sha256: "394f07f4da2bebe6ce6f1e7ce0fa16429b29b08c35e3fac3fe25972676dff4b2",
  },
  "linux-aarch64": {
    file: "deno-aarch64-unknown-linux-gnu.zip",
    sha256: "9a46afc6c392c7cd2ff71a31558935545b46408d0e87f7a86908c712721c046e",
  },
};

const parse = (v: string) => v.split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
export function cmp(a: string, b: string): number {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
/** True when `version` has the regression: >= 2.9.7 and below the first fixed release. */
export const isAffected = (version: string, until: string | null = AFFECTED_UNTIL) =>
  cmp(version, FIRST_AFFECTED) >= 0 && (until === null || cmp(version, until) < 0);

export const platformKey = () => `${Deno.build.os}-${Deno.build.arch}`;
/** Same cache folder as the Daedalus CLI (lib/home.ts): $DAEDALUS_CACHE, else %LOCALAPPDATA%\daedalus, else ~/.daedalus. */
export function cacheRoot(): string {
  const set = Deno.env.get("DAEDALUS_CACHE");
  if (set) return set;
  if (Deno.build.os === "windows") {
    return join(
      Deno.env.get("LOCALAPPDATA") ?? join(Deno.env.get("USERPROFILE") ?? ".", "AppData", "Local"),
      "daedalus",
    );
  }
  return join(Deno.env.get("HOME") ?? ".", ".daedalus");
}
export const pinnedPath = () => join(cacheRoot(), "deno", PINNED, Deno.build.os === "windows" ? "deno.exe" : "deno");

const hexOf = (d: ArrayBuffer) => [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (path: string) => hexOf(await crypto.subtle.digest("SHA-256", await Deno.readFile(path)));

export type Choice = { deno: string; pinned: boolean; reason: string };

/** Which Deno runs the native build. Never uses a downloaded binary whose checksum does not match. */
export async function choose(version = Deno.version.deno, exec = Deno.execPath(), install = false): Promise<Choice> {
  if (!isAffected(version)) {
    return {
      deno: exec,
      pinned: false,
      reason: `Deno ${version} is not affected (affected: >=${FIRST_AFFECTED}${
        AFFECTED_UNTIL ? `, <${AFFECTED_UNTIL}` : ""
      }); using it`,
    };
  }
  const why = `Deno ${version} breaks expo export (denoland/deno#37040); using the official Deno ${PINNED}`;
  const want = ASSETS[platformKey()];
  if (!want) {
    throw new Error(
      `${why}, but there is no known official ${PINNED} build for ${platformKey()}. Use Node/EAS for native builds.`,
    );
  }
  const bin = pinnedPath();
  // The installed exe is checked against the hash recorded at install time (the zip hash is checked on download).
  const recorded = (await Deno.readTextFile(bin + ".sha256").catch(() => "")).trim();
  const have = await sha256(bin).catch(() => "");
  if (!have || have !== recorded) {
    if (!install) {
      throw new Error(
        `${why}, but it is not installed (or failed its checksum) at ${bin}. Run: deno run -A scripts/native-deno.ts --install`,
      );
    }
    await download(want, bin);
  }
  return { deno: bin, pinned: true, reason: `${why} (${bin})` };
}

async function download(want: { file: string; sha256: string }, bin: string): Promise<void> {
  const url = `https://github.com/denoland/deno/releases/download/v${PINNED}/${want.file}`;
  console.log(`[native-deno] downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const zip = new Uint8Array(await res.arrayBuffer());
  const got = hexOf(await crypto.subtle.digest("SHA-256", zip));
  if (got !== want.sha256) {
    throw new Error(`Checksum mismatch for ${want.file}: expected ${want.sha256}, got ${got}. Nothing installed.`);
  }
  const dir = dirname(bin);
  await Deno.mkdir(dir, { recursive: true });
  const zipPath = join(dir, want.file);
  await Deno.writeFile(zipPath, zip);
  const win = Deno.build.os === "windows";
  const r = new Deno.Command(win ? join(Deno.env.get("SystemRoot") ?? "C:\\Windows", "System32", "tar.exe") : "unzip", {
    args: win ? ["-xf", zipPath, "-C", dir] : ["-o", zipPath, "-d", dir],
  }).outputSync();
  await Deno.remove(zipPath);
  if (!r.success) throw new Error("Could not extract the archive.");
  if (!win) await Deno.chmod(bin, 0o755);
  await Deno.writeTextFile(bin + ".sha256", await sha256(bin));
  console.log(`[native-deno] installed ${bin}`);
}

/** Entry point shared by the generated project's build tasks and `daedalus deno`. */
export async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  const take = (f: string) => (args.includes(f) ? (args.splice(args.indexOf(f), 1), true) : false);
  const json = take("--json"), status = take("--status"), doInstall = take("--install");
  const ci = args.indexOf("--cwd");
  const cwd = ci >= 0 ? args.splice(ci, 2)[1] : ".";
  try {
    // Build tasks install on demand; --status only reports and never downloads.
    const c = await choose(Deno.version.deno, Deno.execPath(), doInstall || (!status && args.length > 0));
    if (status || doInstall) {
      console.log(json ? JSON.stringify(c) : `[native-deno] ${c.reason}\n[native-deno] deno: ${c.deno}`);
      return 0;
    }
    if (!args.length) throw new Error("Usage: native-deno.ts [--cwd <appDir>] <task>   (e.g. export:android)");
    console.log(`[native-deno] ${c.reason}\n[native-deno] running: ${c.deno} task ${args.join(" ")} (in ${cwd})`);
    return new Deno.Command(c.deno, {
      args: ["task", ...args],
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).outputSync().code;
  } catch (e) {
    console.error(`[native-deno] ${(e as Error).message}`);
    return 1;
  }
}

if (import.meta.main) Deno.exit(await main(Deno.args));
