// `daedalus` command. Install: `deno install -g -A -n daedalus jsr:@daedalus-framework/cli`, the one-line installers in
// the README, or from a checkout `deno install -g -A -n daedalus <path to this folder>/cli.ts`.
// Every command accepts `--json` (one JSON document on stdout, no prompts); see docs/CLI.md.
import { join } from "node:path";
import { main as nativeDeno } from "./template/scripts/native-deno.ts";
import { flagChoices } from "./lib/blueprint.ts";
import { listPresets } from "./lib/catalog.ts";
import { ensureAssets } from "./lib/assets.ts";
import { AssetsError, denoBin } from "./lib/home.ts";
import { upgrade } from "./lib/upgrade.ts";
import { VERSION } from "./lib/version.ts";

// Flag choices come from the stack.json files and the preset folder, so the help never drifts from what the generator accepts.
function help(root?: string): string {
  const web = root ? flagChoices("web", root) : "spa|site|...";
  const mobile = root ? flagChoices("mobile", root) : "flutter|rn";
  const desktop = root ? flagChoices("desktop", root) : "gpui|tauri";
  const ui = root ? listPresets(root).join("|") : "clean|editorial|playful";
  return `Daedalus ${VERSION}: the AI-assisted framework for building web, mobile and desktop apps. You steer.

Usage:
  daedalus new <dir> [--name N] [--id com.example.app] [--web ${web}|none (comma list)]
                     [--mobile ${mobile}|none] [--desktop ${desktop}|none]
                     [--backend hono|none] [--db postgres|mongodb] [--islands react|vue]
                     [--ui ${ui}] [--modules a,b] [--packs a,b]
                     [--git-name N --git-email E [--remote URL]]   first commit with this identity (never global)
                     [--yes] [--no-check]
  daedalus add-app <stack> <name> [--id com.example.app] [--project <dir>]
  daedalus add-module <name>[,<name>] [--project <dir>]
  daedalus add-pack <name>[,<name>] [--project <dir>]
  daedalus sync [<dir>]
  daedalus check [<dir>]
  daedalus list <stacks|modules|packs|presets>
  daedalus describe <stack|module|pack|preset> <id>
  daedalus docs <query>
  daedalus studio [--project <dir>]         needs Deno on PATH
  daedalus doctor [args]                    check this machine (toolchains, local AI); exit 1 below the minimum; needs Deno
  daedalus deno [--status|--install] [--json]   TEMPORARY: which Deno runs React Native native builds (official 2.9.6 when yours is 2.9.7+)
  daedalus mcp                              start the MCP server on stdio
  daedalus upgrade [--version X.Y.Z]        update this program and fetch the assets of that version
  daedalus --version

Add --json to any command for machine-readable output. Exit codes: 0 ok, 1 failed, 2 invalid input.
You are responsible for what you build with it: see DISCLAIMER.md.`;
}

const forward = (args: string[]) => {
  try {
    const r = new Deno.Command(denoBin(), { args, stdout: "inherit", stderr: "inherit", stdin: "inherit" })
      .outputSync();
    Deno.exit(r.code);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
    console.error("This command needs Deno on your PATH: https://deno.com (Deno 2.9 or newer).");
    Deno.exit(1);
  }
};

async function main(): Promise<void> {
  const [cmd, ...rest] = Deno.args;
  switch (cmd) {
    case "--version":
    case "-v":
    case "version":
      console.log(VERSION);
      return;
    case "upgrade":
      Deno.exit(await upgrade(rest));
      return;
    case undefined:
    case "help":
    case "--help":
    case "-h": {
      let root: string | undefined;
      try {
        root = await ensureAssets();
      } catch { /* offline first run: the help still works without the live flag lists */ }
      console.log(help(root));
      return;
    }
  }

  // Everything below needs the assets: a checkout, DAEDALUS_HOME, or the download cache (fetched on first use).
  const root = await ensureAssets();
  Deno.env.set("DAEDALUS_HOME", root);
  switch (cmd) {
    case "new":
    case "add-app":
    case "add-module":
    case "add-pack":
    case "sync":
    case "check":
    case "list":
    case "describe":
    case "docs": {
      const { run } = await import("./new-project.ts");
      Deno.exit(await run(cmd === "new" ? rest : [cmd, ...rest]));
      break;
    }
    case "studio":
      forward([
        "task",
        "--cwd",
        join(root, "studio"),
        "start",
        ...(rest.includes("--project") ? [] : ["--project", Deno.cwd()]),
        ...rest,
      ]);
      break;
    case "doctor":
      forward(["task", "--cwd", join(root, "studio"), "doctor", ...rest]);
      break;
    case "deno":
      Deno.exit(await nativeDeno(rest.length ? rest : ["--status"]));
      break;
    case "mcp": {
      const { serveStdio } = await import("./mcp.ts");
      await serveStdio();
      break;
    }
    default:
      console.error(`Unknown command "${cmd}".\n\n${help(root)}`);
      Deno.exit(2);
  }
}

try {
  await main();
} catch (e) {
  if (!(e instanceof AssetsError)) throw e;
  console.error(`daedalus: ${e.message}`);
  Deno.exit(1);
}
