// Module discovery and auth-option merging. Kept out of app.ts on purpose: `deno task db:auth-schema` loads this file
// through Better Auth's CLI, which resolves imports like Node and cannot see the contract validator's jsr: dependency.
import type { BetterAuthOptions } from "better-auth";
import type { Module } from "./types.ts";

/** Every `src/modules/<name>/mod.ts`: copying a module folder in is all it takes to enable it. */
export async function discoverModules(): Promise<Module[]> {
  const root = new URL("../../modules/", import.meta.url);
  const names: string[] = [];
  // A folder without mod.ts is a plain library (a pack's ledger or money code), not a module.
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory && await Deno.stat(new URL(`${entry.name}/mod.ts`, root)).then(() => true, () => false)) {
      names.push(entry.name);
    }
  }
  return await Promise.all(
    names.sort().map(async (n) => (await import(new URL(`${n}/mod.ts`, root).href)).default as Module),
  );
}

export function mergeAuthOptions(parts: Partial<BetterAuthOptions>[]): Partial<BetterAuthOptions> {
  return parts.reduce<Partial<BetterAuthOptions>>((all, p) => ({
    ...all,
    ...p,
    plugins: [...(all.plugins ?? []), ...(p.plugins ?? [])],
    emailAndPassword: { enabled: true, ...all.emailAndPassword, ...p.emailAndPassword },
  }), {});
}
