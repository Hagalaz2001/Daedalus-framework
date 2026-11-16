// Daedalus Studio entry point: `deno task studio`. Usage: deno run -A server/main.ts [--project <dir>] [--port 4310]
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "./api.ts";
import { ensureDemoProject } from "./demo.ts";
import { loadEnv } from "./env.ts";
import { createProvider } from "./providers/index.ts";

const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Deno.args;
const arg = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// Project: --project, else the parent folder when it is a generated project, else a throwaway demo project.
const fromArg = arg("project");
const parent = resolve(studioDir, "..");
const hasManifest = (dir: string) => {
  try {
    return Deno.statSync(join(dir, ".blueprint.json")).isFile;
  } catch {
    return false;
  }
};
const root = fromArg ? resolve(fromArg) : hasManifest(parent) ? parent : ensureDemoProject(studioDir);

const env = loadEnv([join(studioDir, ".env"), join(root, ".env")]);
if (arg("port")) env.port = Number(arg("port"));
if (arg("provider")) env.provider = arg("provider")!;

let provider;
try {
  provider = createProvider(env);
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}\n`);
  Deno.exit(1);
}

const dist = join(studioDir, "ui", "dist");
const built = (() => {
  try {
    return Deno.statSync(join(dist, "index.html")).isFile;
  } catch {
    return false;
  }
})();
const api = createApi({ root, env, provider, uiDir: built ? dist : null });

Deno.serve({
  hostname: "127.0.0.1",
  port: env.port,
  onListen: ({ port }) => {
    console.log(`Daedalus Studio  http://127.0.0.1:${port}`);
    console.log(`  project   ${root}`);
    console.log(`  provider  ${provider.label}${provider.note ? ` (${provider.note})` : ""}`);
    if (!built) console.log("  UI is not built yet: run `deno task studio:build` first.");
  },
}, (req) => api.handle(req, env.port));
