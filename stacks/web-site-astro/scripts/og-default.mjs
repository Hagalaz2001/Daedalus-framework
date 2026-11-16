// `deno task og:default`: draws the default social card (public/og-default.png, 1200x630) from design/tokens.json
// (brand colour, display font) and src/lib/site.ts (name, tagline). Run it once, and again after changing the brand or
// the site name; commit the PNG. Uses @napi-rs/canvas (MIT, prebuilt for Windows, macOS and Linux) and the @fontsource font files.
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const appDir = process.cwd();

// design/tokens.json lives at the project root: walk up from the app folder.
let root = appDir;
while (!existsSync(join(root, "design", "tokens.json")) && dirname(root) !== root) root = dirname(root);
const tokens = JSON.parse(readFileSync(join(root, "design", "tokens.json"), "utf8"));

const site = readFileSync(join(appDir, "src", "lib", "site.ts"), "utf8");
const pick = (key) => site.match(new RegExp(`${key}:\\s*'([^']*)'`))?.[1] ?? "";
const name = pick("name");
const tagline = pick("tagline");

const slug = (n) => n.toLowerCase().replace(/\s+/g, "-");
const family = [tokens.font.display ?? tokens.font.sans, "Geist"].find((f) => {
  try {
    const dir = require.resolve(`@fontsource/${slug(f)}/package.json`).replace(/package\.json$/, "");
    GlobalFonts.registerFromPath(`${dir}files/${slug(f)}-latin-700-normal.woff`, f);
    return true;
  } catch {
    return false;
  }
});
if (!family) throw new Error("No font found: add @fontsource/<your display font> to package.json devDependencies");

const W = 1200, H = 630, PAD = 72;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = tokens.color.primary;
ctx.fillRect(0, 0, W, H);
ctx.fillStyle = tokens.color.onPrimary;
ctx.textBaseline = "alphabetic";

ctx.font = `700 34px "${family}"`;
ctx.fillText(name, PAD, PAD + 28);

// Title: bottom-anchored, wrapped by real glyph widths, at most 4 lines.
const size = tagline.length > 60 ? 64 : 84;
ctx.font = `700 ${size}px "${family}"`;
const lines = [];
let line = "";
for (const word of tagline.split(/\s+/).filter(Boolean)) {
  const next = line ? `${line} ${word}` : word;
  if (line && ctx.measureText(next).width > W - PAD * 2) {
    lines.push(line);
    line = word;
  } else line = next;
}
if (line) lines.push(line);
const shown = lines.slice(0, 4);
const lh = size * 1.05;
const last = H - PAD - size * 0.2;
shown.forEach((l, i) => ctx.fillText(l, PAD, last - (shown.length - 1 - i) * lh));

writeFileSync(join(appDir, "public", "og-default.png"), canvas.toBuffer("image/png"));
console.log(`  wrote public/og-default.png (${family}, ${tokens.color.primary})`);
