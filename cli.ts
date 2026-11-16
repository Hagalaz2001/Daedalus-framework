// `daedalus` command. Install once: `deno install -g -A -n daedalus <path to this folder>/cli.ts`.
// Every command accepts `--json` (one JSON document on stdout, no prompts); see docs/CLI.md.
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { run } from "./new-project.ts";
import { main as nativeDeno } from "./template/scripts/native-deno.ts";
import { flagChoices } from "./lib/blueprint.ts";
import { listPresets } from "./lib/catalog.ts";

const here = dirname(fromFileUrl(import.meta.url));
// Flag choices come from the stack.json files and the preset folder, so the help never drifts from what the generator accepts.
const HELP = `Daedalus: the AI-assisted framework for building web, mobile and desktop apps. You steer.

Usage:
  daedalus new <dir> [--name N] [--id com.example.app] [--web ${flagChoices("web", here)}|none (comma list)]
                     [--mobile ${flagChoices("mobile", here)}|none] [--desktop ${flagChoices("desktop", here)}|none]
                     [--backend hono|none] [--db postgres|mongodb] [--islands react|vue]
                     [--ui ${listPresets(here).join("|")}] [--modules a,b] [--packs a,b]
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
  daedalus studio [--project <dir>]
  daedalus doctor [args]                    check this machine (toolchains, local AI); exit 1 below the minimum
  daedalus deno [--status|--install] [--json]   TEMPORARY: which Deno runs React Native native builds (patched Deno 2.9.7+ IPC bug)
  daedalus mcp                              start the MCP server on stdio

Add --json to any command for machine-readable output. Exit codes: 0 ok, 1 failed, 2 invalid input.
You are responsible for what you build with it: see DISCLAIMER.md.`;

const [cmd, ...rest] = Deno.args;
const forward = (args: string[]) => {
  const r = new Deno.Command(Deno.execPath(), { args, stdout: "inherit", stderr: "inherit", stdin: "inherit" })
    .outputSync();
  Deno.exit(r.code);
};

switch (cmd) {
  case "new":
  case "add-app":
  case "add-module":
  case "add-pack":
  case "sync":
  case "check":
  case "list":
  case "describe":
  case "docs":
    Deno.exit(await run(cmd === "new" ? rest : [cmd, ...rest]));
    break;
  case "studio":
    forward([
      "task",
      "--cwd",
      join(here, "studio"),
      "start",
      ...(rest.includes("--project") ? [] : ["--project", Deno.cwd()]),
      ...rest,
    ]);
    break;
  case "doctor":
    forward(["task", "--cwd", join(here, "studio"), "doctor", ...rest]);
    break;
  case "deno":
    Deno.exit(await nativeDeno(rest.length ? rest : ["--status"]));
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
