// `daedalus` command. Install once: `deno install -g -A -n daedalus <path to this folder>/cli.ts`.
// Every command accepts `--json` (one JSON document on stdout, no prompts); see docs/CLI.md.
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { run } from "./new-project.ts";

const HELP = `Daedalus: the AI-assisted framework for building web, mobile and desktop apps. You steer.

Usage:
  daedalus new <dir> [--name N] [--id com.example.app] [--web spa|spa-vue|site|site-next|none]
                     [--mobile flutter|rn|none] [--desktop gpui|tauri|none] [--backend hono|none]
                     [--islands react|vue] [--ui clean|editorial] [--modules a,b] [--packs a,b]
                     [--yes] [--no-check]
  daedalus add-app <stack> <name> [--id com.example.app] [--project <dir>]
  daedalus add-module <name>[,<name>] [--project <dir>]
  daedalus add-pack <name>[,<name>] [--project <dir>]
  daedalus sync [<dir>]
  daedalus check [<dir>]
  daedalus list <stacks|modules|packs|presets>
  daedalus describe <stack|module|pack|preset> <id>
  daedalus docs <query>
  daedalus studio [--project <dir>]
  daedalus doctor [args]                    check this machine (toolchains, local AI); exit 1 below the minimum
  daedalus mcp                              start the MCP server on stdio

Add --json to any command for machine-readable output. Exit codes: 0 ok, 1 failed, 2 invalid input.
You are responsible for what you build with it: see DISCLAIMER.md.`;

const [cmd, ...rest] = Deno.args;
const here = dirname(fromFileUrl(import.meta.url));
const forward = (args: string[]) => {
  const r = new Deno.Command(Deno.execPath(), { args, stdout: "inherit", stderr: "inherit", stdin: "inherit" }).outputSync();
  Deno.exit(r.code);
};

switch (cmd) {
  case "new":
    Deno.exit(await run(rest));
  // falls through only if run did not exit; kept for clarity
  case "add-app":
  case "add-module":
  case "add-pack":
  case "sync":
  case "check":
  case "list":
  case "describe":
  case "docs":
    Deno.exit(await run([cmd, ...rest]));
  case "studio":
    forward(["task", "--cwd", join(here, "studio"), "start", ...(rest.includes("--project") ? [] : ["--project", Deno.cwd()]), ...rest]);
    break;
  case "doctor":
    forward(["task", "--cwd", join(here, "studio"), "doctor", ...rest]);
    break;
  case "mcp":
    forward(["run", "-A", join(here, "mcp.ts")]);
    break;
  case undefined:
  case "help":
  case "--help":
  case "-h":
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command "${cmd}".\n\n${HELP}`);
    Deno.exit(2);
}
