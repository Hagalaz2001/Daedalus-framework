// TEMPORARY: runs React Native native builds (expo export) with a patched Deno while upstream Deno 2.9.7+ has the
// child_process IPC regression (denoland/deno#37040, fix PR #37080). See tools/deno-patched/README.md in the Daedalus checkout.
// Usage: deno run -A scripts/native-deno.ts [--cwd <appDir>] <task>     e.g. export:android
//        deno run -A scripts/native-deno.ts --status [--json] | --install
// Delete this file (and the build:android / build:ios tasks that call it) once a fixed Deno is released.
import { dirname, join } from "jsr:@std/path@1";

// First stable Deno release that contains the fix. null = not released yet; set it when upstream ships (e.g. "2.9.9").
export const FIRST_FIXED: string | null = null;
export const FIRST_AFFECTED = "2.9.7";
export const TAG = "deno-patched-v2.9.8-1";
export const REPO = "https://github.com/OWNER/REPO"; // TODO(owner): the GitHub repo that holds the deno-patched releases.
// Platform key -> release asset and its SHA-256. Empty sha256 = release not published yet; the binary is then refused.
export const ASSETS: Record<string, { file: string; sha256: string }> = {
  "windows-x86_64": { file: "deno-x86_64-pc-windows-msvc.zip", sha256: "" },
  "darwin-aarch64": { file: "deno-aarch64-apple-darwin.zip", sha256: "" },
  "darwin-x86_64": { file: "deno-x86_64-apple-darwin.zip", sha256: "" },
  "linux-x86_64": { file: "deno-x86_64-unknown-linux-gnu.zip", sha256: "" },
};

const parse = (v: string) => v.split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
export function cmp(a: string, b: string): number {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
/** True when `version` has the IPC bug: >= 2.9.7 and below the first fixed release. */
export const isAffected = (version: string, fixed: string | null = FIRST_FIXED) =>
  cmp(version, FIRST_AFFECTED) >= 0 && (fixed === null || cmp(version, fixed) < 0);

export const platformKey = () => `${Deno.build.os}-${Deno.build.arch}`;
export const patchedPath = () =>
  join(
    Deno.env.get("DAEDALUS_DENO_HOME") ??
      join(Deno.env.get("USERPROFILE") ?? Deno.env.get("HOME") ?? ".", ".daedalus", "deno-patched"),
    TAG,
    Deno.build.os === "windows" ? "deno.exe" : "deno",
  );

function hexOf(d: ArrayBuffer): string {
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const sha256 = async (path: string) => hexOf(await crypto.subtle.digest("SHA-256", await Deno.readFile(path)));

export type Choice = { deno: string; patched: boolean; reason: string };
/** Decide which Deno runs the native build. Never falls back to a binary whose checksum does not match. */
export async function choose(version = Deno.version.deno, exec = Deno.execPath()): Promise<Choice> {
  if (!isAffected(version)) {
    return {
      deno: exec,
      patched: false,
      reason: `Deno ${version} is not in the affected range (>=${FIRST_AFFECTED}${
        FIRST_FIXED ? `, <${FIRST_FIXED}` : ""
      }); using it`,
    };
  }
  const want = ASSETS[platformKey()];
  const bin = patchedPath();
  const how = `Deno ${version} has the child_process IPC bug (denoland/deno#37040)`;
  if (!want?.sha256) {
    throw new Error(
      `${how}, and no verified patched build is listed for ${platformKey()} yet. Use Node/EAS for native builds, or build tools/deno-patched/ yourself.`,
    );
  }
  let have: string;
  try {
    have = await sha256(bin);
  } catch {
    throw new Error(`${how}. Patched Deno not installed at ${bin}. Run: deno run -A scripts/native-deno.ts --install`);
  }
  // The archive checksum is verified at install time; the installed exe is checked against the hash recorded beside it.
  const recorded = (await Deno.readTextFile(bin + ".sha256").catch(() => "")).trim();
  if (!recorded || recorded !== have) {
    throw new Error(`${how}. Installed patched Deno at ${bin} failed its checksum; reinstall with --install.`);
  }
  return {
    deno: bin,
    patched: true,
    reason: `${how}; using the patched build ${TAG} (sha256 ${have.slice(0, 12)}...)`,
  };
}

export async function install(): Promise<void> {
  const want = ASSETS[platformKey()];
  if (!want?.sha256) {
    throw new Error(`No verified patched build is listed for ${platformKey()} yet (checksum table empty).`);
  }
  const bin = patchedPath();
  const url = `${REPO}/releases/download/${TAG}/${want.file}`;
  console.log(`Downloading ${url}`);
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
  const r = new Deno.Command(win ? "tar" : "unzip", {
    args: win ? ["-xf", zipPath, "-C", dir] : ["-o", zipPath, "-d", dir],
  }).outputSync();
  await Deno.remove(zipPath);
  if (!r.success) throw new Error("Could not extract the archive.");
  if (!win) await Deno.chmod(bin, 0o755);
  await Deno.writeTextFile(bin + ".sha256", await sha256(bin));
  console.log(`Installed ${bin}`);
}

/** Entry point shared by the generated project's build tasks and `daedalus deno`. */
export async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  const take = (f: string) => (args.includes(f) ? (args.splice(args.indexOf(f), 1), true) : false);
  const json = take("--json"), status = take("--status"), doInstall = take("--install");
  const ci = args.indexOf("--cwd");
  const cwd = ci >= 0 ? args.splice(ci, 2)[1] : ".";
  try {
    if (doInstall) await install();
    const c = await choose();
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
