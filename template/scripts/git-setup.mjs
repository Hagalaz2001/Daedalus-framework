// Set up version control for this project: identity, hooks, remote, first commit.
//   node scripts/git-setup.mjs --name "Your Name" --email you@example.com [--remote <url>] [--commit]
// Identity is per repository (never global), so work and personal accounts don't mix.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

if (!existsSync(".git")) git("init", "-q", "-b", "main");
const name = flag("name");
const email = flag("email");
if (name) git("config", "user.name", name);
if (email) git("config", "user.email", email);
git("config", "core.hooksPath", ".githooks");
git("config", "core.autocrlf", "false");
git("config", "pull.rebase", "true");

const remote = flag("remote");
if (remote) {
  const existing = (() => {
    try {
      return git("remote", "get-url", "origin");
    } catch {
      return "";
    }
  })();
  if (existing && existing !== remote) git("remote", "set-url", "origin", remote);
  else if (!existing) git("remote", "add", "origin", remote);
}

if (args.includes("--commit")) {
  git("add", "-A");
  const hasHead = (() => {
    try {
      git("rev-parse", "--verify", "HEAD");
      return true;
    } catch {
      return false;
    }
  })();
  if (!hasHead) git("commit", "-q", "-m", "chore: start project from dev-blueprint");
}

const show = (k) => {
  try {
    return git("config", k);
  } catch {
    return "(not set)";
  }
};
console.log(`git: ${show("user.name")} <${show("user.email")}>, hooks .githooks, remote ${remote ?? "(none)"}`);
if (show("user.email") === "(not set)") console.log("Set the identity: node scripts/git-setup.mjs --name ... --email ...");
