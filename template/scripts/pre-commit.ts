// Git pre-commit hook body (.githooks/pre-commit runs it; `deno task setup` installs the hook). Checks only what is
// staged, so it stays fast: 1. secrets (built-in patterns, plus gitleaks when it is installed), 2. formatting, 3. lint.
// Skip once, knowingly, with `git commit --no-verify`; CI runs the same checks again and cannot be skipped.
import { runArgs } from "./lib/exec.ts";

const staged = runArgs("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], { capture: true });
const files = staged.stdout.split("\n").filter(Boolean);
if (!files.length) Deno.exit(0);

const failures: string[] = [];
const step = (label: string, cmd: string, args: string[]) => {
  console.error(`pre-commit: ${label}`);
  if (!runArgs(cmd, args).ok) failures.push(label);
};

step("secret scan", "deno", ["run", "-A", "scripts/secret-scan.ts"]);

// gitleaks is optional (a single Go binary, MIT: https://github.com/gitleaks/gitleaks); CI always runs it.
let hasGitleaks = true;
try {
  hasGitleaks = runArgs("gitleaks", ["version"], { capture: true }).ok;
} catch {
  hasGitleaks = false;
}
if (hasGitleaks) {
  step("gitleaks (staged changes)", "gitleaks", ["git", "--pre-commit", "--staged", "--redact", "--no-banner"]);
} else {console.error(
    "pre-commit: gitleaks not installed, skipped (CI still runs it). Install: https://github.com/gitleaks/gitleaks#installing",
  );}

// Only files Deno formats and lints, and only those the project's deno.json does not exclude.
const FMT = /\.(ts|tsx|js|jsx|mjs|json|jsonc|md|css|html|ya?ml)$/;
const LINT = /\.(ts|tsx|js|jsx|mjs)$/;
const excluded = /(^|\/)(node_modules|dist|build|apps|\.agents|\.claude)\//;
const fmtFiles = files.filter((f) => FMT.test(f) && !excluded.test(f) && !f.endsWith("schema.d.ts"));
const lintFiles = fmtFiles.filter((f) => LINT.test(f));
if (fmtFiles.length) step("format (run `deno fmt` to fix)", "deno", ["fmt", "--check", ...fmtFiles]);
if (lintFiles.length) step("lint", "deno", ["lint", ...lintFiles]);

if (failures.length) {
  console.error(`\nCommit refused: ${failures.join(", ")}. Fix the lines above and commit again.`);
  Deno.exit(1);
}
