// One-time setup after cloning or generating: `deno task setup`.
// Installs the git hooks (secret scan, format, lint before every commit), writes the Dependabot file for the
// ecosystems this project uses, and tells you what is still manual. Safe to run again.
import { chmodSync, existsSync } from "node:fs";
import { runArgs } from "./lib/exec.ts";

if (existsSync(".git")) {
  runArgs("git", ["config", "core.hooksPath", ".githooks"]);
  if (Deno.build.os !== "windows") chmodSync(".githooks/pre-commit", 0o755);
  console.log("git hooks installed (.githooks/pre-commit: secret scan, format, lint).");
} else {
  console.log("No .git folder yet: run `git init`, then `deno task setup` again to install the hooks.");
}
runArgs("deno", ["run", "-A", "scripts/security-sync.ts"]);

console.log(`
Still manual (each is explained in docs/DEVSECOPS.md):
  - install gitleaks for the local secret scan (optional, CI always scans)
  - turn on branch protection and secret scanning:  deno task protect-branch   (prints the commands)
  - uncomment your team in .github/CODEOWNERS and write your contact into SECURITY.md
  - deployment stays OFF until you add environments and secrets and set DEPLOY_ENABLED`);
