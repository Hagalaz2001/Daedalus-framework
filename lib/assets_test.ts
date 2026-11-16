import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TarStream } from "jsr:@std/tar@0.1.10/tar-stream";
import { AssetsError, ensureAssets, extractTarGz, installAssets, latestVersion, parseChecksums } from "./assets.ts";
import { buildAssets, writeChecksums } from "../tools/build-release.ts";
import { serveRelease } from "../tools/fake-release.ts";
import { binaryName } from "./upgrade.ts";
import { VERSION } from "./version.ts";

/** A tiny stand-in for the repo (template/, stacks/, a doc), packed and published on a local fake release server. */
async function fixture(version = "9.9.9") {
  const tmp = Deno.makeTempDirSync({ prefix: "daedalus-assets-" });
  const src = join(tmp, "src");
  const dist = join(tmp, "dist");
  for (
    const [f, text] of Object.entries({
      "template/AGENTS.md": "# agents\n",
      "stacks/web/stack.json": "{}\n",
      "docs/CLI.md": "# cli\n",
      "VERSION": `${version}\n`,
      "website/skip.txt": "not shipped\n",
    })
  ) {
    mkdirSync(join(src, f, ".."), { recursive: true });
    writeFileSync(join(src, f), text);
  }
  const { sha256 } = await buildAssets(dist, version, src);
  await writeChecksums(dist);
  const server = serveRelease(dist);
  const logs: string[] = [];
  return { tmp, dist, server, sha256, cache: join(tmp, "cache"), log: (l: string) => logs.push(l), logs };
}

Deno.test("installAssets downloads, verifies and extracts into the cache", async () => {
  const f = await fixture();
  try {
    const dir = await installAssets({ base: f.server.base, cache: f.cache, version: "9.9.9", log: f.log });
    assertEquals(dir, join(f.cache, "assets", "9.9.9"));
    assertEquals(readFileSync(join(dir, "template/AGENTS.md"), "utf8"), "# agents\n");
    assert(existsSync(join(dir, "docs/CLI.md")));
    assert(!existsSync(join(dir, "website")), "only runtime folders are shipped");
    assertEquals(f.server.hits.length, 2);
    // Second call finds the cache and does not touch the network.
    await ensureAssets({ base: f.server.base, cache: f.cache, version: "9.9.9", log: f.log });
    assertEquals(f.server.hits.length, 2);
    assertEquals(await latestVersion({ base: f.server.base }), "9.9.9");
  } finally {
    await f.server.shutdown();
  }
});

Deno.test("a tarball that does not match checksums.txt is refused and nothing is left behind", async () => {
  const f = await fixture();
  try {
    writeFileSync(join(f.dist, "daedalus-assets-v9.9.9.tar.gz"), new Uint8Array([1, 2, 3]));
    const err = await assertRejects(
      () => installAssets({ base: f.server.base, cache: f.cache, version: "9.9.9", log: f.log }),
      AssetsError,
      "Checksum mismatch",
    );
    assert(err);
    assert(!existsSync(join(f.cache, "assets")));
  } finally {
    await f.server.shutdown();
  }
});

Deno.test("a release without a checksums.txt entry is refused", async () => {
  const f = await fixture();
  try {
    writeFileSync(join(f.dist, "checksums.txt"), "");
    await assertRejects(
      () => installAssets({ base: f.server.base, cache: f.cache, version: "9.9.9", log: f.log }),
      AssetsError,
      "no entry",
    );
  } finally {
    await f.server.shutdown();
  }
});

Deno.test("offline and missing releases give an actionable error", async () => {
  const f = await fixture();
  const base = f.server.base;
  await assertRejects(
    () => installAssets({ base, cache: f.cache, version: "1.2.3", log: f.log }),
    AssetsError,
    "404",
  );
  await f.server.shutdown();
  await assertRejects(
    () => installAssets({ base, cache: f.cache, version: "9.9.9", log: f.log }),
    AssetsError,
    "internet connection",
  );
});

Deno.test("extractTarGz refuses paths that escape the target folder", async () => {
  const body = new TextEncoder().encode("x");
  const gz = ReadableStream.from([{
    type: "file" as const,
    path: "../evil.txt",
    size: body.length,
    readable: ReadableStream.from([body]),
  }]).pipeThrough(new TarStream()).pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(gz).arrayBuffer());
  const dest = Deno.makeTempDirSync({ prefix: "daedalus-extract-" });
  await assertRejects(() => extractTarGz(bytes, dest), AssetsError, "Unsafe path");
  assert(!existsSync(join(dest, "..", "evil.txt")));
});

Deno.test("parseChecksums reads sha256sum output", () => {
  const h = "a".repeat(64);
  assertEquals([...parseChecksums(`${h}  one.tgz\n${h} *two.exe\nnot a line\n`).keys()], ["one.tgz", "two.exe"]);
});

Deno.test("binaryName maps platforms to release files", () => {
  assertEquals(binaryName("windows", "x86_64"), "daedalus-windows-x64.exe");
  assertEquals(binaryName("darwin", "aarch64"), "daedalus-macos-arm64");
  assertEquals(binaryName("linux", "aarch64"), "daedalus-linux-arm64");
  assertEquals(binaryName("windows", "aarch64"), undefined);
  assertEquals(binaryName("freebsd", "x86_64"), undefined);
});

Deno.test("VERSION, deno.json and lib/version.ts agree", () => {
  const root = join(import.meta.dirname!, "..");
  const file = readFileSync(join(root, "VERSION"), "utf8").trim();
  assertEquals(JSON.parse(readFileSync(join(root, "deno.json"), "utf8")).version, file);
  assertEquals(VERSION, file);
});
