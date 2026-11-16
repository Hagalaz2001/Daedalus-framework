// File access for design files: a symlink anywhere on the way (the design folder, a screen folder, the
// file itself) must never let a read or write leave the project. Every helper checks with lstat and
// realpath before touching a file. (Same idea as the Meetings reader.)
import { Buffer } from "node:buffer";
import { lstat, mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

async function realInside(root: string, target: string): Promise<boolean> {
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
  return realTarget === realRoot || realTarget.startsWith(realRoot + sep);
}

/** A regular file inside the project (not a link, not behind a linked folder), within `maxBytes`. */
export async function readProjectFile(projectDir: string, full: string, maxBytes: number): Promise<Buffer> {
  const info = await lstat(full);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error("That is not a regular file inside the project.");
  if (info.size > maxBytes) throw new Error("That file is too large.");
  if (!(await realInside(projectDir, full))) throw new Error("That file is outside the project.");
  return readFile(full);
}

export async function readProjectText(projectDir: string, full: string, maxBytes: number): Promise<string> {
  return (await readProjectFile(projectDir, full, maxBytes)).toString("utf8");
}

/** Creates the folder chain, then refuses when it resolves outside the project or the target is a link. */
export async function writeProjectFile(projectDir: string, full: string, data: string | Uint8Array): Promise<void> {
  const folder = dirname(resolve(full));
  await mkdir(folder, { recursive: true });
  if (!(await realInside(projectDir, folder))) throw new Error("That folder is outside the project.");
  const existing = await lstat(full).catch(() => null);
  if (existing?.isSymbolicLink()) throw new Error("Refusing to write through a link.");
  await writeFile(full, data);
}

/** Entries of a folder inside the project; links are skipped. */
export async function readProjectDir(projectDir: string, folder: string): Promise<{ name: string; isDirectory: boolean }[]> {
  const info = await lstat(folder).catch(() => null);
  if (!info || info.isSymbolicLink() || !info.isDirectory() || !(await realInside(projectDir, folder))) return [];
  const entries = await readdir(folder, { withFileTypes: true });
  return entries.filter((e) => !e.isSymbolicLink() && (e.isFile() || e.isDirectory())).map((e) => ({
    name: e.name,
    isDirectory: e.isDirectory(),
  }));
}

/** A file picked by the person outside the project (a Stitch export): still no links. */
export async function readPickedFile(full: string, maxBytes: number): Promise<Buffer | null> {
  const info = await lstat(full).catch(() => null);
  return info && info.isFile() && !info.isSymbolicLink() && info.size <= maxBytes ? readFile(full) : null;
}
