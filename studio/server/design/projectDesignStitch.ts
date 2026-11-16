// Optional second engine: Google's Stitch (npm @google/stitch-sdk, Apache-2.0). Runs in main only.
// The SDK is loaded on first use so it costs nothing at app start, and the API key never leaves
// this process. Downloaded HTML is sanitised like any other design; remote assets are embedded only
// when the user asks (inlineRemote), and only from a short list of hosts per kind of asset.
import { Buffer } from "node:buffer";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { type DesignCommand, designStem, type DesignTarget, isDesignFile } from "../../shared/design/index.ts";
import { type Fetched, guardedDownload, stitchHostAllowed } from "./projectDesignNet.ts";
import { readProjectText, writeProjectFile } from "./projectDesignFs.ts";
import { analyzeDesignHtml, sanitizeDesignHtml } from "./projectDesignSanitize.ts";
import { beginStep, designFilePath, readManifest, screenDir, writeManifest } from "./projectDesignStore.ts";
import { contentSha, trustScript } from "./projectDesignTrust.ts";

/** The slice of the SDK this module uses, so tests can supply a fake. */
export interface StitchScreenLike {
  getHtml(): Promise<string>;
  getImage(): Promise<string>;
  variants(prompt: string, options: { variantCount: number; creativeRange: "EXPLORE" }): Promise<StitchScreenLike[]>;
}
export interface StitchSdkLike {
  open(
    apiKey: string,
  ): { generate(title: string, prompt: string, device: "MOBILE" | "DESKTOP"): Promise<StitchScreenLike>; close(): Promise<void> };
}
/** What is being fetched decides which hosts and sizes are acceptable. */
export type AssetKind = "result" | "script" | "style" | "image";
export type Download = (url: string, kind: AssetKind) => Promise<Fetched>;
export interface StitchDeps {
  loadSdk: () => Promise<StitchSdkLike>;
  download: Download;
}

const MAX_INLINE_ASSETS = 20;
const IMAGE_MIME = /^image\/(?:png|jpeg|webp|gif)$/;
const deviceFor = (target: DesignTarget) => (target === "web-desktop" ? "DESKTOP" : "MOBILE");

/** Per-kind rules: Tailwind's script only from its CDN, fonts CSS only from Google Fonts, images only from Google hosts. */
const ASSET_RULES: Record<AssetKind, { maxBytes: number; hostAllowed: (host: string) => boolean }> = {
  result: { maxBytes: 8 * 1024 * 1024, hostAllowed: stitchHostAllowed },
  script: { maxBytes: 2 * 1024 * 1024, hostAllowed: (host) => host === "cdn.tailwindcss.com" },
  style: { maxBytes: 512 * 1024, hostAllowed: (host) => host === "fonts.googleapis.com" },
  image: {
    maxBytes: 2 * 1024 * 1024,
    hostAllowed: (host) => /(^|\.)googleusercontent\.com$/.test(host) || /(^|\.)gstatic\.com$/.test(host),
  },
};

export const guardedAssetDownload: Download = (url, kind) => guardedDownload(url, ASSET_RULES[kind]);

export const loadStitchSdk = async (): Promise<StitchSdkLike> => {
  const { Stitch, StitchToolClient } = await import("@google/stitch-sdk");
  return {
    open(apiKey) {
      const client = new StitchToolClient({ apiKey, timeout: 300_000 });
      const sdk = new Stitch(client);
      return {
        generate: async (title, prompt, device) => (await sdk.createProject(title)).generate(prompt, device),
        close: () => client.close(),
      };
    },
  };
};

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const isPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isJpeg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8;

/** Stores the raw download (for a later user-triggered embed), the sanitised page and the screenshot. */
export async function saveStitchVariant(dir: string, slug: string, file: string, raw: string, image: Uint8Array | null): Promise<void> {
  const stem = designStem(file);
  await writeProjectFile(dir, join(screenDir(dir, slug), `${stem}.source.html`), raw);
  await writeProjectFile(dir, designFilePath(dir, slug, file), sanitizeDesignHtml(raw));
  if (image && (isPng(image) || isJpeg(image))) {
    await writeProjectFile(dir, join(screenDir(dir, slug), `${stem}.${isPng(image) ? "png" : "jpg"}`), image);
  }
}

type Generate = Extract<DesignCommand, { kind: "stitch-generate" }>;

export async function runStitch(dir: string, cmd: Generate, apiKey: string, deps: StitchDeps): Promise<{ slug: string }> {
  const { slug, step } = await beginStep(dir, {
    kind: "begin",
    step: "generate",
    name: cmd.name,
    brief: cmd.brief,
    target: cmd.target,
    count: cmd.count,
  });
  const manifest = await readManifest(dir, slug);
  if (!manifest) throw new Error("Could not create the screen.");
  await writeManifest(dir, { ...manifest, engine: "stitch", model: "google-stitch" });
  const session = (await deps.loadSdk()).open(apiKey);
  try {
    const first = await session.generate("Design Studio", cmd.brief, deviceFor(cmd.target));
    const more = step.files.length > 1
      ? await first.variants(cmd.brief, { variantCount: step.files.length - 1, creativeRange: "EXPLORE" })
      : [];
    for (const [i, screen] of [first, ...more].slice(0, step.files.length).entries()) {
      const file = step.files[i]!;
      const raw = text((await deps.download(await screen.getHtml(), "result")).bytes);
      const image = await deps.download(await screen.getImage(), "result").catch(() => null);
      await saveStitchVariant(dir, slug, file, raw, image?.bytes ?? null);
    }
  } catch (error) {
    // Never echo the SDK error verbatim: it may carry request headers.
    throw new Error(
      `Stitch could not generate the design: ${
        error instanceof Error ? error.message.replaceAll(apiKey, "***").slice(0, 200) : "unknown error"
      }`,
    );
  } finally {
    await session.close().catch(() => undefined);
  }
  return { slug };
}

const hostOf = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
    return parsed.protocol === "https:" ? parsed.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};
const absolute = (url: string) => (url.startsWith("//") ? `https:${url}` : url);

/** Stitch pages configure Tailwind with a small inline assignment; anything more than that is not kept. */
const FORBIDDEN_IN_CONFIG = [
  "fetch",
  "import",
  "eval",
  "function(",
  "xmlhttp",
  "websocket",
  "document",
  "window",
  "location",
  "cookie",
  "storage",
  "postmessage",
  "settimeout",
  "<",
];
export function isTailwindConfig(script: string): boolean {
  const code = script.trim();
  if (!code.startsWith("tailwind.config") || code.length > 50_000) return false;
  const lower = code.toLowerCase();
  return !FORBIDDEN_IN_CONFIG.some((word) => lower.includes(word));
}

/** User-triggered: fetch the allowed remote assets of a Stitch design and embed them, so the preview still loads nothing. */
export async function inlineRemote(dir: string, slug: unknown, file: unknown, download: Download): Promise<void> {
  if (!isDesignFile(file)) throw new Error("Not a design file.");
  const manifest = await readManifest(dir, String(slug));
  if (!manifest || manifest.engine !== "stitch") throw new Error("Only Stitch designs keep remote assets.");
  const source = await readProjectText(dir, join(screenDir(dir, manifest.slug), `${designStem(file)}.source.html`), 8 * 1024 * 1024);
  const $ = cheerio.load(source);
  let budget = MAX_INLINE_ASSETS;
  let usesScript = false;
  const tasks: Promise<void>[] = [];
  $("script").each((_, el) => {
    const node = $(el);
    const src = node.attr("src");
    if (src === undefined) {
      if (isTailwindConfig(node.text())) usesScript = true;
      else node.remove();
      return;
    }
    if (hostOf(src) !== "cdn.tailwindcss.com" || budget-- <= 0) return void node.remove();
    tasks.push(
      download(absolute(src), "script").then(
        (fetched) => {
          node.removeAttr("src").text(text(fetched.bytes).replace(/<\/script/gi, "<\\/script"));
          usesScript = true;
        },
        () => void node.remove(),
      ),
    );
  });
  $("link").each((_, el) => {
    const node = $(el);
    const href = node.attr("href") ?? "";
    if (!/stylesheet/i.test(node.attr("rel") ?? "") || hostOf(href) !== "fonts.googleapis.com" || budget-- <= 0) return void node.remove();
    tasks.push(
      download(absolute(href), "style").then(
        (fetched) => void node.replaceWith(`<style>${text(fetched.bytes).replace(/</g, "")}</style>`),
        () => void node.remove(),
      ),
    );
  });
  $("img").each((_, el) => {
    const node = $(el);
    const src = node.attr("src") ?? "";
    if (!/^(?:https:)?\/\//i.test(src.trim())) return;
    if (!hostOf(src.trim()) || budget-- <= 0) return void node.removeAttr("src");
    tasks.push(
      download(absolute(src.trim()), "image").then(
        ({ bytes, type }) => {
          const mime = type.split(";")[0]!.trim().toLowerCase();
          if (!IMAGE_MIME.test(mime)) return void node.removeAttr("src");
          node.attr("src", `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`);
        },
        () => void node.removeAttr("src"),
      ),
    );
  });
  await Promise.all(tasks);
  // The sanitiser cleans what it finds; what is written must pass the gate on a second look with nothing left to remove.
  const analysis = analyzeDesignHtml($.html(), { allowInlineScripts: usesScript });
  const again = analyzeDesignHtml(analysis.html, { allowInlineScripts: usesScript });
  if (again.problems.length || again.html !== analysis.html) {
    throw new Error(`Embedded design is still not safe: ${again.problems.join(" ") || "it changed on a second pass"}`);
  }
  await writeProjectFile(dir, designFilePath(dir, manifest.slug, file), analysis.html);
  if (usesScript) await trustScript(dir, manifest.slug, file, contentSha(analysis.html));
}
