// `deno task og:per-page`: OPT-IN. Turns on a separate Open Graph image for every journal post (and one for the site).
// It adds the dependency @resvg/resvg-js, which is licensed MPL-2.0 (file-level copyleft; it is used only at build time and
// nothing from it ships in the site). Projects that must stay on MIT/Apache/BSD/ISC dependencies should skip this and keep
// the default single image from `deno task og:default`.
//
// What it does: copies optional/og-per-page/src into src/, adds "@resvg/resvg-js" (exact version) to package.json,
// sets `og: 'per-page'` in src/lib/site.ts, and runs `deno install` at the project root.
import { execSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const RESVG = "2.6.2";
const app = process.cwd();
const from = join(app, "optional", "og-per-page", "src");
if (!existsSync(from)) {
  console.log("Per-page OG is already enabled (optional/og-per-page not found).");
  process.exit(0);
}

console.log("Enabling per-page OG images. This adds @resvg/resvg-js (MPL-2.0) as a dependency.");
cpSync(from, join(app, "src"), { recursive: true });

const pkgPath = join(app, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.dependencies = Object.fromEntries(Object.entries({ ...pkg.dependencies, "@resvg/resvg-js": RESVG }).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const sitePath = join(app, "src", "lib", "site.ts");
writeFileSync(sitePath, readFileSync(sitePath, "utf8").replace("og: 'default' as 'default' | 'per-page'", "og: 'per-page' as 'default' | 'per-page'"));

let root = app;
while (!existsSync(join(root, "deno.json")) && dirname(root) !== root) root = dirname(root);
execSync("deno install", { cwd: root, stdio: "inherit" });
console.log("Done. Build the site: pages now use /og/site.png and /og/<post>.png. To go back, remove the copied files and the dependency.");
