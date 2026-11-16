import type { ImageMetadata } from "astro";
import showcase from "../data/generated/showcase.json";
import facts from "../data/generated/site.json";

export const REPO = "https://github.com/Hagalaz2001/Daedalus-framework";
export const SITE = "https://hagalaz2001.github.io/Daedalus-framework";
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const url = (p: string) => `${base}${p}`;

const images = import.meta.glob<{ default: ImageMetadata }>("/src/assets/showcase/**/*.png", { eager: true });
/** Resolves a manifest path such as "web-spa/dashboard-light.png" to Astro image metadata. */
export function shot(path?: string): ImageMetadata | undefined {
  return path ? images[`/src/assets/showcase/${path}`]?.default : undefined;
}

export type ShowcaseItem = (typeof showcase.platforms)[number]["items"][number] & { light?: string; dark?: string; single?: string };
export { facts, showcase };

/** First item of a stack whose name matches, for hand-picked landing-page placements. */
export function pick(stack: string, name: string): ShowcaseItem | undefined {
  for (const p of showcase.platforms) for (const i of p.items as ShowcaseItem[]) if (i.stack === stack && i.name === name) return i;
}
