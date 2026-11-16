// `daedalus upgrade [--version X.Y.Z]`: fetch the assets of the target version and, for the single-file binary, replace
// the binary itself (checked against the release's checksums.txt). Under deno or from a checkout it prints what to run.
import { chmodSync, renameSync, rmSync, writeFileSync } from "node:fs";
import {
  AssetsError,
  DEFAULT_RELEASES,
  download,
  expectedSha,
  installAssets,
  latestVersion,
  releaseUrl,
  sha256Hex,
} from "./assets.ts";
import type { FetchOpts } from "./assets.ts";
import { isCompiled } from "./home.ts";
import { VERSION } from "./version.ts";

/** Release file name of the binary for this machine, e.g. `daedalus-windows-x64.exe`; undefined when unsupported. */
export function binaryName(os: string = Deno.build.os, arch: string = Deno.build.arch): string | undefined {
  const a = arch === "x86_64" ? "x64" : arch === "aarch64" ? "arm64" : undefined;
  const o = os === "windows" ? "windows" : os === "darwin" ? "macos" : os === "linux" ? "linux" : undefined;
  if (!a || !o || (o === "windows" && a !== "x64")) return undefined;
  return `daedalus-${o}-${a}${o === "windows" ? ".exe" : ""}`;
}

/** Runs the command; returns the exit code. */
export async function upgrade(args: string[], o: FetchOpts = {}): Promise<number> {
  const log = o.log ?? ((l: string) => console.log(l));
  const vi = args.indexOf("--version");
  try {
    const target = vi >= 0 ? args[vi + 1]?.replace(/^v/, "") : await latestVersion(o);
    if (!target || !/^\d+\.\d+\.\d+$/.test(target)) {
      console.error("Usage: daedalus upgrade [--version X.Y.Z]");
      return 2;
    }
    const base = (o.base ?? Deno.env.get("DAEDALUS_RELEASES") ?? "").replace(/\/+$/, "") || undefined;
    const opts = { ...o, base, version: target, log };
    await installAssets(opts);
    if (isCompiled()) {
      if (target === VERSION) {
        log(`daedalus ${VERSION} is already the version you asked for; assets refreshed.`);
        return 0;
      }
      const name = binaryName();
      if (!name) {
        throw new AssetsError(`No prebuilt binary for ${Deno.build.os} ${Deno.build.arch}; use the JSR package.`);
      }
      const b = (base ?? DEFAULT_RELEASES).replace(/\/+$/, "");
      log(`Downloading ${name} ${target}`);
      const bytes = await download(releaseUrl(b, target, name));
      const expected = await expectedSha(b, target, name);
      const actual = await sha256Hex(bytes);
      if (actual !== expected) {
        throw new AssetsError(`Checksum mismatch for ${name}; the running program was not changed.`);
      }
      replaceSelf(bytes);
      log(`Updated daedalus ${VERSION} -> ${target}.`);
    } else {
      log(
        `Assets for ${target} are ready. To update the command itself:\n` +
          `  deno install -g -A -f -n daedalus jsr:@daedalus-framework/cli@${target}\n` +
          `  (from a checkout: git pull)`,
      );
    }
    return 0;
  } catch (e) {
    if (!(e instanceof AssetsError)) throw e;
    console.error(`daedalus upgrade: ${e.message}`);
    return 1;
  }
}

/** Swaps the running executable. Windows cannot overwrite it but can rename it; the old file is removed on the next run. */
function replaceSelf(bytes: Uint8Array) {
  const self = Deno.execPath();
  const fresh = `${self}.new`;
  writeFileSync(fresh, bytes);
  if (Deno.build.os !== "windows") chmodSync(fresh, 0o755);
  const old = `${self}.old`;
  rmSync(old, { force: true });
  renameSync(self, old);
  renameSync(fresh, self);
  if (Deno.build.os !== "windows") rmSync(old, { force: true });
}
