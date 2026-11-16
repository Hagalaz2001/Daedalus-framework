// Set up version control for this project: identity, hooks, remote, first commit.
//   deno task git:setup --name "Your Name" --email you@example.com [--remote <url>] [--commit]
// Identity is per repository (never global), so work and personal accounts don't mix.
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { isGitRemote, runArgs } from "./lib/exec.ts";

export const isEmail = (s: string) => /^[^\s@<>"'`$&|;\\]+@[^\s@<>"'`$&|;\\]+\.[^\s@<>"'`$&|;\\]+$/.test(s);

/** Throws on input that must not reach git (flags in disguise, shell syntax, control characters). */
export function validateGitInput(o: { name?: string; email?: string; remote?: string }) {
  // deno-lint-ignore no-control-regex
  if (o.name !== undefined && (!o.name.trim() || o.name.startsWith("-") || /[\x00-\x1f]/.test(o.name))) {
    throw new Error(`--name is not a valid name: ${o.name}`);
  }
  if (o.email !== undefined && !isEmail(o.email)) throw new Error(`--email is not a valid email address: ${o.email}`);
  if (o.remote !== undefined && !isGitRemote(o.remote)) {
    throw new Error(`--remote must be a git URL or path without spaces or shell characters: ${o.remote}`);
  }
}

function main() {
  const { values } = parseArgs({
    args: Deno.args,
    options: {
      name: { type: "string" },
      email: { type: "string" },
      remote: { type: "string" },
      commit: { type: "boolean" },
    },
  });
  validateGitInput(values);
  const git = (...a: string[]) => {
    const r = runArgs("git", a, { capture: true });
    if (!r.ok) throw new Error(`git ${a.join(" ")} failed: ${r.stderr.trim()}`);
    return r.stdout.trim();
  };
  const tryGit = (...a: string[]) => {
    const r = runArgs("git", a, { capture: true });
    return r.ok ? r.stdout.trim() : undefined;
  };

  if (!existsSync(".git")) git("init", "-q", "-b", "main");
  if (values.name) git("config", "user.name", values.name);
  if (values.email) git("config", "user.email", values.email);
  git("config", "core.hooksPath", ".githooks");
  git("config", "core.autocrlf", "false");
  git("config", "pull.rebase", "true");

  if (values.remote) {
    const existing = tryGit("remote", "get-url", "origin") ?? "";
    if (existing && existing !== values.remote) git("remote", "set-url", "origin", values.remote);
    else if (!existing) git("remote", "add", "origin", values.remote);
  }

  if (values.commit) {
    git("add", "-A");
    if (tryGit("rev-parse", "--verify", "HEAD") === undefined) {
      git("commit", "-q", "-m", "chore: start project from Daedalus");
    }
  }

  console.log(
    `git: ${tryGit("config", "user.name") ?? "(not set)"} <${
      tryGit("config", "user.email") ?? "(not set)"
    }>, hooks .githooks, remote ${values.remote ?? "(none)"}`,
  );
  if (tryGit("config", "user.email") === undefined) {
    console.log("Set the identity: deno task git:setup --name ... --email ...");
  }
}

if (import.meta.main) main();
