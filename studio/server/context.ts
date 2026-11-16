// Reads what the studio needs from a project: DESIGN.md, design/tokens.json (+ presets), the stacks in
// .blueprint.json and the UI kit's public exports. Pure reads; nothing here writes.
import { join } from "node:path";

import { type Tokens } from "../shared/design/tokens.ts";
export { tokenMap, type Tokens, tokensCss } from "../shared/design/tokens.ts";
export interface Preset {
  id: string;
  name: string;
  description: string;
  tokens: Tokens;
}
export interface AppRef {
  stack: string;
  kind: string;
  dir: string;
  name: string;
}
export interface ProjectContext {
  root: string;
  name: string;
  designMd: string | null;
  tokens: Tokens | null;
  presets: Preset[];
  apps: AppRef[];
  /** Public exports of the web UI kit (docs for the model), when the project has one. */
  kitDocs: string | null;
}

const read = (path: string): string | null => {
  try {
    return Deno.readTextFileSync(path);
  } catch {
    return null;
  }
};
const json = <T>(path: string): T | null => {
  const text = read(path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

export function readContext(root: string): ProjectContext {
  const manifest = json<{ name?: string; apps?: AppRef[] }>(join(root, ".blueprint.json"));
  const tokens = json<Tokens>(join(root, "design", "tokens.json"));
  const presets: Preset[] = [];
  try {
    for (const e of Deno.readDirSync(join(root, "design", "presets"))) {
      if (!e.name.endsWith(".json")) continue;
      const p = json<Tokens & { meta?: { id?: string; name?: string; description?: string } }>(
        join(root, "design", "presets", e.name),
      );
      if (p?.color) {
        presets.push({
          id: p.meta?.id ?? e.name.replace(/\.json$/, ""),
          name: p.meta?.name ?? e.name,
          description: p.meta?.description ?? "",
          tokens: p,
        });
      }
    }
  } catch {
    // No presets folder.
  }
  const kitDocs = read(join(root, "packages", "ui", "src", "index.ts")) ??
    read(join(root, "stacks", "web-shared", "packages", "ui", "src", "index.ts"));
  return {
    root,
    name: manifest?.name ?? "Project",
    designMd: read(join(root, "DESIGN.md")),
    tokens,
    presets: presets.sort((a, b) => a.id.localeCompare(b.id)),
    apps: manifest?.apps ?? [],
    kitDocs,
  };
}
