// CycloneDX 1.5 SBOM of the CLI's dependencies, from deno.lock: `deno run -A tools/sbom.ts [out.json]` (default dist/sbom.cdx.json).
// Only the root deno.lock is read; the generated apps carry their own lock files.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fromFileUrl } from "jsr:@std/path@1";

const root = join(dirname(fromFileUrl(import.meta.url)), "..");

interface Component {
  type: "library";
  name: string;
  version: string;
  purl: string;
}

/** Components from the `jsr` and `npm` sections of a deno.lock text (v4/v5 layout: keys are `name@version`). */
export function componentsFromLock(lockText: string): Component[] {
  const lock = JSON.parse(lockText) as { jsr?: Record<string, unknown>; npm?: Record<string, unknown> };
  const out: Component[] = [];
  for (const [eco, entries] of [["jsr", lock.jsr], ["npm", lock.npm]] as const) {
    for (const key of Object.keys(entries ?? {})) {
      const at = key.indexOf("@", 1);
      if (at <= 0) continue;
      const name = key.slice(0, at);
      const version = key.slice(at + 1).split("_")[0]; // npm keys can carry peer suffixes after "_"
      const purl = eco === "npm"
        ? `pkg:npm/${name.replace(/^@/, "%40")}@${version}`
        : `pkg:generic/${encodeURIComponent(name)}@${version}?repository_url=https://jsr.io`;
      out.push({ type: "library", name, version, purl });
    }
  }
  return out.sort((a, b) => a.purl.localeCompare(b.purl));
}

export function sbom(version: string, lockText: string): Record<string, unknown> {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: { component: { type: "application", name: "daedalus", version } },
    components: componentsFromLock(lockText).map((c) => ({ ...c, "bom-ref": c.purl })),
  };
}

if (import.meta.main) {
  const out = Deno.args[0] ?? join(root, "dist", "sbom.cdx.json");
  mkdirSync(dirname(out), { recursive: true });
  const version = readFileSync(join(root, "VERSION"), "utf8").trim();
  writeFileSync(out, JSON.stringify(sbom(version, readFileSync(join(root, "deno.lock"), "utf8")), null, 2) + "\n");
  console.log(out);
}
