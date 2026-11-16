// Which files may run scripts in their preview. Only the app decides: a record lives in the app's own
// data folder, keyed by project path, file and the SHA-256 of the exact content, so nothing a project
// file says (design.json included) can switch scripts on, and editing the file drops the trust.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

let trustFile: string | null = null;
const memory = new Set<string>();

/** Called once at startup with a file under the app data folder. Without it (tests) trust is kept in memory. */
export const setScriptTrustFile = (file: string | null): void => {
  trustFile = file;
  memory.clear();
};

export const contentSha = (text: string): string => createHash("sha256").update(text).digest("hex");
const keyOf = (dir: string, slug: string, file: string, sha: string) =>
  createHash("sha256").update(`${resolve(dir)}\0${slug}/${file}\0${sha}`).digest("hex");

async function load(): Promise<Set<string>> {
  if (!trustFile) return memory;
  try {
    const parsed: unknown = JSON.parse(await readFile(trustFile, "utf8"));
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export async function isScriptTrusted(dir: string, slug: string, file: string, sha: string): Promise<boolean> {
  return (await load()).has(keyOf(dir, slug, file, sha));
}

export async function trustScript(dir: string, slug: string, file: string, sha: string): Promise<void> {
  const keys = await load();
  keys.add(keyOf(dir, slug, file, sha));
  if (!trustFile) return;
  await mkdir(dirname(trustFile), { recursive: true });
  await writeFile(trustFile, JSON.stringify([...keys].slice(-2000)), { mode: 0o600 });
}
