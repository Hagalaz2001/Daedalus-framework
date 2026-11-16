// Regenerates everything derived from a source of truth: `deno task sync`.
//   contracts/openapi.yaml -> packages/api_ts (TypeScript client) and, per stack, its own client (Dart for Flutter)
//   design/tokens.json     -> each app's theme file, through the stack's tokens script (scripts/tokens/<stack>.ts)
// Which stacks exist comes from .blueprint.json.
import { existsSync, readFileSync } from "node:fs";
import { shell } from "./lib/exec.ts";
import { OPENAPI_TYPESCRIPT } from "./versions.ts";

interface Cmd {
  cwd: string;
  run: string;
}
interface App {
  stack: string;
  dir: string;
  tokens?: string;
  sync: Cmd[];
}

const run = (cmd: string, cwd = ".") => {
  console.log(`
> [${cwd}] ${cmd}`);
  if (!shell(cmd, { cwd }).ok) throw new Error(`Failed: ${cmd} (in ${cwd})`);
};

const manifest = JSON.parse(readFileSync(".blueprint.json", "utf8")) as { apps: App[]; extras?: { sync: Cmd[] }[] };

if (existsSync("packages/api_ts")) {
  // openapi-typescript needs the TypeScript 5 compiler API; --no-config keeps it away from the workspace's TypeScript 7.
  run(
    `deno run -A --no-config npm:openapi-typescript@${OPENAPI_TYPESCRIPT} contracts/openapi.yaml -o packages/api_ts/src/schema.d.ts`,
  );
}

const done = new Set<string>();
const once = (key: string, fn: () => void) => {
  if (!done.has(key)) {
    done.add(key);
    fn();
  }
};
for (const app of manifest.apps) {
  if (app.tokens) once(app.tokens, () => run(app.tokens!));
}
for (const app of manifest.apps) {
  for (const c of app.sync) once(`${c.cwd}|${c.run}`, () => run(c.run, c.cwd));
}
for (const e of manifest.extras ?? []) for (const c of e.sync) once(`${c.cwd}|${c.run}`, () => run(c.run, c.cwd));
console.log("\nSynced.");
