// Daedalus Studio entry point: `deno task studio`. Usage: deno run -A server/main.ts [--project <dir>] [--port 4310]
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "./api.ts";
import { ensureDemoProject } from "./demo.ts";
import { loadEnv, validateEnv } from "./env.ts";

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

try {
  validateEnv(env);
} catch (e) {
  console.error(`
${e instanceof Error ? e.message : e}
`);
  Deno.exit(1);
}

const dist = join(studioDir, "ui", "dist");
const isBuilt = () => {
  try {
    return Deno.statSync(join(dist, "index.html")).isFile;
  } catch {
    return false;
  }
};
// First run: build the UI once (a few seconds). Later runs reuse ui/dist; `deno task build` rebuilds it.
if (!isBuilt()) {
  console.log("Building the studio UI (first run)...");
  const build = await new Deno.Command(Deno.execPath(), {
    args: ["task", "build"],
    cwd: studioDir,
    stdout: "inherit",
    stderr: "inherit",
  })
    .output();
  if (!build.success) console.error("The UI build failed; the API still runs.");
}
const built = isBuilt();
const api = createApi({ root, env, uiDir: built ? dist : null });

Deno.serve({
  hostname: "127.0.0.1",
  port: env.port,
  onListen: ({ port }) => {
    console.log(`Daedalus Studio  http://127.0.0.1:${port}`);
    console.log(`  project   ${root}`);
    console.log(
      `  provider  ${env.provider}${env.provider === "auto" ? " (your key, then local AI, then demo fixtures)" : ""}`,
    );
    if (!built) console.log("  UI is not built yet: run `deno task studio:build` first.");
  },
}, (req) => api.handle(req, env.port));
