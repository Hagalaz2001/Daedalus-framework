// `deno task i18n:check`: every locale in i18n/messages/ must have the same keys and the same {placeholders} as the
// first locale (en). Fails with the list of problems, so a missing translation never ships silently.
const dir = new URL("./messages/", import.meta.url);
const catalogs = new Map<string, Record<string, string>>();
for await (const f of Deno.readDir(dir)) {
  if (f.name.endsWith(".json")) {
    catalogs.set(f.name.slice(0, -5), JSON.parse(await Deno.readTextFile(new URL(f.name, dir))));
  }
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const base = catalogs.get("en");
const problems: string[] = [];
if (!base) problems.push("i18n/messages/en.json is the reference catalog and is missing");
for (const [locale, messages] of catalogs) {
  for (const [key, text] of Object.entries(base ?? {})) {
    if (!(key in messages)) problems.push(`${locale}: missing "${key}"`);
    else if (placeholders(messages[key]!) !== placeholders(text)) {
      problems.push(`${locale}: placeholders of "${key}" differ from en`);
    }
  }
  for (const key of Object.keys(messages)) {
    if (base && !(key in base)) problems.push(`${locale}: "${key}" is not in en`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  Deno.exit(1);
}
console.log(`i18n ok: ${[...catalogs.keys()].join(", ")} (${Object.keys(base!).length} messages)`);
