import type { Module } from "../../shared/http/types.ts";

// Catalogs live at the project root (i18n/messages/<locale>.json) so web, mobile and the API share one source.
const dir = new URL("../../../../i18n/messages/", import.meta.url);
const catalogs = new Map<string, Record<string, string>>();
for await (const f of Deno.readDir(dir)) {
  if (f.name.endsWith(".json")) {
    catalogs.set(f.name.slice(0, -5), JSON.parse(await Deno.readTextFile(new URL(f.name, dir))));
  }
}

export const locales = [...catalogs.keys()];
export const defaultLocale = "en";

/** Picks the best supported locale from an Accept-Language header ("es-MX,es;q=0.9,en;q=0.8" -> "es"). */
export function negotiate(header: string | null | undefined): string {
  const wanted = (header ?? "").split(",").map((part) => {
    const [tag, q] = part.trim().split(";q=");
    return { lang: (tag ?? "").toLowerCase().split("-")[0]!, q: q ? Number(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  return wanted.find((w) => catalogs.has(w.lang))?.lang ?? defaultLocale;
}

/** `t("es", "notes.count", { count: 3 })` -> "3 notas". Falls back to English, then to the key itself. */
export function t(locale: string, key: string, vars: Record<string, string | number> = {}): string {
  const text = catalogs.get(locale)?.[key] ?? catalogs.get(defaultLocale)?.[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (whole, name) => String(vars[name] ?? whole));
}

export default { name: "i18n" } satisfies Module;
