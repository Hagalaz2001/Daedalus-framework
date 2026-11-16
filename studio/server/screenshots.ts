// Screenshot set for docs/screenshots: phone, tablet and desktop widths, light and dark. Uses playwright-core with a
// browser that is already installed (no download): set STUDIO_BROWSER to "chrome" (default), "msedge" or "chromium",
// or STUDIO_BROWSER_PATH to an executable. If no browser can be launched the export simply goes without images.
import { Buffer } from "node:buffer";
import { chromium } from "playwright-core";
import type { PlannedFile } from "./export.ts";

export const SHOT_SIZES = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

export async function screenshotSet(
  html: string,
  stem: string,
  env: Record<string, string | undefined> = Deno.env.toObject(),
): Promise<{ files: PlannedFile[]; skipped?: string }> {
  let browser;
  try {
    const path = env.STUDIO_BROWSER_PATH;
    browser = await chromium.launch(path ? { executablePath: path } : { channel: env.STUDIO_BROWSER ?? "chrome" });
  } catch {
    return {
      files: [],
      skipped: "No browser found for screenshots. Install Chrome or Edge, or set STUDIO_BROWSER / STUDIO_BROWSER_PATH.",
    };
  }
  try {
    const files: PlannedFile[] = [];
    for (const size of SHOT_SIZES) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      // Designs carry no scripts and load nothing remote; block the network anyway.
      await page.route(
        "**/*",
        (route) => (route.request().url().startsWith("data:") ? route.continue() : route.abort()),
      );
      await page.setContent(html, { waitUntil: "load" });
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
        const png = await page.screenshot({ fullPage: false });
        files.push({
          path: `docs/screenshots/${stem}-${size.name}-${theme}.png`,
          content: Buffer.from(png).toString("base64"),
          binary: true,
        });
      }
      await context.close();
    }
    return { files };
  } finally {
    await browser.close();
  }
}
