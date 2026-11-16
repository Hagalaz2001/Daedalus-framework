// Where the Daedalus assets (template/, stacks/, modules/ ...) live. Three cases, in this order:
//   1. $DAEDALUS_HOME, when it points at a folder that has them (a checkout or an extracted release);
//   2. the checkout this file is running from (`deno run cli.ts`);
//   3. the per-user cache that `daedalus` fills from the GitHub release of the same version (see lib/assets.ts).
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.ts";

/** Thrown when no assets are available and none can be fetched. */
export class AssetsError extends Error {
  override name = "AssetsError";
}

/** True inside a `deno compile` binary (its executable is not called deno). */
export function isCompiled(): boolean {
  return !/^deno(\.exe)?$/i.test(basename(Deno.execPath()));
}

/** The program that runs Deno tasks and scripts: this process under `deno`, the `deno` on PATH inside a binary. */
export function denoBin(): string {
  return isCompiled() ? "deno" : Deno.execPath();
}

/** A folder holds the assets when it has the template and the stacks. */
export function hasAssets(dir: string): boolean {
  return existsSync(join(dir, "template")) && existsSync(join(dir, "stacks"));
}

/** Per-user cache folder: $DAEDALUS_CACHE, else %LOCALAPPDATA%\daedalus on Windows, else ~/.daedalus. */
export function cacheRoot(): string {
  const set = Deno.env.get("DAEDALUS_CACHE");
  if (set) return set;
  if (Deno.build.os === "windows") {
    const base = Deno.env.get("LOCALAPPDATA") ?? join(Deno.env.get("USERPROFILE") ?? ".", "AppData", "Local");
    return join(base, "daedalus");
  }
  return join(Deno.env.get("HOME") ?? ".", ".daedalus");
}

/** Where the assets of one version are extracted. */
export const assetsDir = (version: string = VERSION, cache: string = cacheRoot()): string =>
  join(cache, "assets", version);

/** The assets folder to use right now, or undefined when none is available yet (then `ensureAssets` downloads them). */
export function findRoot(): string | undefined {
  const env = Deno.env.get("DAEDALUS_HOME");
  if (env && hasAssets(env)) return env;
  if (!isCompiled() && import.meta.url.startsWith("file:")) {
    const checkout = join(dirname(fileURLToPath(import.meta.url)), "..");
    if (hasAssets(checkout)) return checkout;
  }
  const cached = assetsDir();
  return hasAssets(cached) ? cached : undefined;
}

/** Like `findRoot`, but throws an actionable error when there are no assets. */
export function blueprintRoot(): string {
  const root = findRoot();
  if (root) return root;
  throw new AssetsError(
    `Daedalus assets v${VERSION} are not installed. Run \`daedalus upgrade\` (needs internet), ` +
      `or set DAEDALUS_HOME to a Daedalus checkout.`,
  );
}
