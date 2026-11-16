// Sanitiser verdicts by content hash. The same bytes always get the same answer, so a verdict survives a
// restart, a touched mtime and a copied folder: a first scan of a project that was already checked parses
// nothing, and a pile of hostile files is parsed once each, ever. The file lives in the app data folder.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface Verdict {
  problems: string[];
  remote: boolean;
}

const MAX_VERDICTS = 2000;
let file: string | null = null;
let cache: Map<string, Verdict> | null = null;
let timer: NodeJS.Timeout | null = null;

/** Called once at startup with a file under the app data folder; without it (tests) verdicts stay in memory. */
export const setVerdictFile = (path: string | null): void => {
  file = path;
  cache = null;
};

const valid = (v: unknown): v is Verdict =>
  !!v && typeof v === "object" && Array.isArray((v as Verdict).problems) && (v as Verdict).problems.every((p) =>
    typeof p === "string"
  ) &&
  typeof (v as Verdict).remote === "boolean";

async function load(): Promise<Map<string, Verdict>> {
  if (cache) return cache;
  cache = new Map();
  if (!file) return cache;
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    for (const [key, v] of Object.entries(parsed)) if (valid(v)) cache.set(key, v);
  } catch {
    // Missing or damaged: start empty, the next verdicts rebuild it.
  }
  return cache;
}

export async function getVerdict(key: string): Promise<Verdict | undefined> {
  return (await load()).get(key);
}

export async function putVerdict(key: string, verdict: Verdict): Promise<void> {
  const map = await load();
  if (map.size >= MAX_VERDICTS) map.delete(map.keys().next().value as string);
  map.set(key, verdict);
  if (!file || timer) return;
  timer = setTimeout(() => {
    timer = null;
    const target = file;
    if (!target) return;
    void mkdir(dirname(target), { recursive: true })
      // Temp file then rename: a crash mid-write leaves the old file whole, never a truncated one.
      .then(async () => {
        const temp = `${target}.${process.pid}.tmp`;
        await writeFile(temp, JSON.stringify(Object.fromEntries(map)), { mode: 0o600 });
        await rename(temp, target);
      })
      .catch(() => undefined);
  }, 1000);
  timer.unref();
}
