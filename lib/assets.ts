// Fetches the Daedalus assets (template/, stacks/, modules/, dbs/, packs/, studio/, docs/) of the running version from the
// GitHub release, checks them, and extracts them to the per-user cache. A checkout never needs this.
//   <releases>/download/v<ver>/daedalus-assets-v<ver>.tar.gz   the assets
//   <releases>/download/v<ver>/checksums.txt                   "<sha256>  <file>" lines for every release file
//   <releases>/latest/download/VERSION                          the newest version number
// The tarball must match checksums.txt AND, when the build carries one, the checksum embedded for that version.
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { UntarStream } from "jsr:@std/tar@0.1.10/untar-stream";
import { assetsDir, AssetsError, findRoot, hasAssets } from "./home.ts";
import { VERSION } from "./version.ts";
import { EMBEDDED_SHA256 } from "./embedded-checksums.ts";

export { AssetsError };

/** Release page of the project; override with $DAEDALUS_RELEASES (a mirror, or a local server in tests). */
export const DEFAULT_RELEASES = "https://github.com/Hagalaz2001/Daedalus-framework/releases";

export interface FetchOpts {
  /** Releases base URL. Default: $DAEDALUS_RELEASES or the GitHub releases page. */
  base?: string;
  /** Cache folder. Default: $DAEDALUS_CACHE or the per-user folder. */
  cache?: string;
  /** Version to fetch. Default: the version of this CLI. */
  version?: string;
  /** Progress lines go here (stderr by default). */
  log?: (line: string) => void;
}

const baseOf = (o: FetchOpts) => (o.base ?? Deno.env.get("DAEDALUS_RELEASES") ?? DEFAULT_RELEASES).replace(/\/+$/, "");
const logOf = (o: FetchOpts) => o.log ?? ((l: string) => console.error(l));

export const assetsTarball = (version: string): string => `daedalus-assets-v${version}.tar.gz`;
export const releaseUrl = (base: string, version: string | "latest", file: string): string =>
  version === "latest" ? `${base}/latest/download/${file}` : `${base}/download/v${version}/${file}`;

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parses `sha256sum` output: "<64 hex>  <file>" (or "<hex> *<file>"). */
export function parseChecksums(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line);
    if (m) out.set(m[2], m[1].toLowerCase());
  }
  return out;
}

/** GET with a clear message when the network or the release is missing. */
export async function download(url: string): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new AssetsError(
      `Could not reach ${url} (${e instanceof Error ? e.message : e}). Check your internet connection and run ` +
        `\`daedalus upgrade\` again, or set DAEDALUS_HOME to a Daedalus checkout to work offline.`,
    );
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new AssetsError(
      res.status === 404
        ? `Not found (404): ${url}. That release may not be published yet: use a checkout via DAEDALUS_HOME, or another version.`
        : `Download failed (HTTP ${res.status}): ${url}`,
    );
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** The newest released version number. */
export async function latestVersion(o: FetchOpts = {}): Promise<string> {
  const v = new TextDecoder().decode(await download(releaseUrl(baseOf(o), "latest", "VERSION"))).trim();
  if (!/^\d+\.\d+\.\d+$/.test(v)) throw new AssetsError(`The release server returned an invalid version: "${v}"`);
  return v;
}

/** Looks up `file` in the release's checksums.txt. */
export async function expectedSha(base: string, version: string, file: string): Promise<string> {
  const sums = parseChecksums(new TextDecoder().decode(await download(releaseUrl(base, version, "checksums.txt"))));
  const sha = sums.get(file);
  if (!sha) throw new AssetsError(`checksums.txt of v${version} has no entry for ${file}; refusing to use it.`);
  return sha;
}

/** Extracts a .tar.gz into `dest`. Refuses absolute paths, `..` and anything that is not a plain file or folder. */
export async function extractTarGz(bytes: Uint8Array, dest: string): Promise<void> {
  const entries = new Response(bytes as BodyInit).body!
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new UntarStream());
  for await (const entry of entries) {
    const rel = normalize(entry.path).replace(/\\/g, "/").replace(/^\.\//, "");
    if (!rel || rel === "." || isAbsolute(rel) || /^[A-Za-z]:/.test(rel) || rel.split("/").includes("..")) {
      if (rel !== "." && rel !== "") throw new AssetsError(`Unsafe path in the assets archive: ${entry.path}`);
      await entry.readable?.cancel();
      continue;
    }
    const type = entry.header.typeflag;
    const target = join(dest, rel);
    if (type === "5") {
      mkdirSync(target, { recursive: true });
    } else if (type === "0" || type === "\0") {
      mkdirSync(dirname(target), { recursive: true });
      const file = await Deno.open(target, { write: true, create: true, truncate: true });
      await entry.readable!.pipeTo(file.writable);
    } else {
      throw new AssetsError(`Unsupported entry in the assets archive (${rel}, type ${type})`);
    }
  }
}

/** Downloads, verifies and extracts the assets of `version` into the cache (replacing what was there). Returns the folder. */
export async function installAssets(o: FetchOpts = {}): Promise<string> {
  const version = o.version ?? VERSION;
  const base = baseOf(o);
  const log = logOf(o);
  const file = assetsTarball(version);
  log(`Downloading Daedalus ${version} assets from ${releaseUrl(base, version, file)}`);
  const [bytes, expected] = await Promise.all([
    download(releaseUrl(base, version, file)),
    expectedSha(base, version, file),
  ]);
  const actual = await sha256Hex(bytes);
  if (actual !== expected) {
    throw new AssetsError(`Checksum mismatch for ${file}: expected ${expected}, got ${actual}. Nothing was installed.`);
  }
  const embedded = EMBEDDED_SHA256[version];
  if (embedded && embedded !== actual) {
    throw new AssetsError(
      `${file} does not match the checksum built into this CLI (${embedded}). Nothing was installed.`,
    );
  }
  const final = assetsDir(version, o.cache);
  const tmp = `${final}.partial-${crypto.randomUUID().slice(0, 8)}`;
  try {
    mkdirSync(tmp, { recursive: true });
    await extractTarGz(bytes, tmp);
    if (!hasAssets(tmp)) throw new AssetsError("The assets archive is missing template/ or stacks/.");
    rmSync(final, { recursive: true, force: true });
    renameSync(tmp, final);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  log(`Assets ready in ${final}`);
  return final;
}

/** The assets folder to use: a checkout or DAEDALUS_HOME if there is one, else the cache, downloading it on first use. */
export async function ensureAssets(o: FetchOpts = {}): Promise<string> {
  if (o.cache === undefined && o.version === undefined) {
    const found = findRoot();
    if (found) return found;
  } else {
    const dir = assetsDir(o.version, o.cache);
    if (hasAssets(dir)) return dir;
  }
  return await installAssets(o);
}
