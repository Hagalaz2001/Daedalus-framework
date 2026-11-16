// Refuses a commit that adds secrets: .env files, private keys, API keys and tokens.
// Run by .githooks/pre-commit on the staged changes; `deno task secrets` scans every tracked file.
import { runArgs } from "./lib/exec.ts";

const git = (...a: string[]) => {
  const r = runArgs("git", a, { capture: true });
  if (!r.ok) throw new Error(`git ${a.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
};

export const BLOCKED_FILES = [/(^|\/)\.env(\.[^/]*)?$/, /\.(pem|p12|pfx|keystore|jks)$/i, /(^|\/)id_(rsa|ed25519)$/];
export const ALLOWED_FILES = [/\.env\.example$/];
export const PATTERNS: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI-style key", /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["GitLab token", /\bglpat-[A-Za-z0-9_-]{20,}/],
  ["AWS key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Stripe live key", /\b[rs]k_live_[0-9a-zA-Z]{20,}/],
  ["Slack token", /\bxox[abpr]-[0-9A-Za-z-]{10,}/],
  ["Supabase service key", /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S{20,}/],
  ["database URL with password", /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]{6,}@(?!localhost|127\.0\.0\.1)/],
];

/** Problems found in one file (its path and, when readable, its text). */
export function scanFile(file: string, text: string | null): string[] {
  if (ALLOWED_FILES.some((r) => r.test(file))) return [];
  if (BLOCKED_FILES.some((r) => r.test(file))) return [`${file}: this kind of file must never be committed`];
  if (text === null || text.includes("\u0000")) return []; // unreadable or binary
  return PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => `${file}: looks like a ${label}`);
}

if (import.meta.main) {
  const all = Deno.args.includes("--all");
  const files = (all ? git("ls-files") : git("diff", "--cached", "--name-only", "--diff-filter=ACM")).split("\n")
    .filter(Boolean);
  const problems: string[] = [];
  for (const file of files) {
    let text: string | null = null;
    try {
      text = all ? git("show", `HEAD:${file}`) : git("show", `:${file}`);
    } catch { /* not in the index or HEAD: skip */ }
    problems.push(...scanFile(file, text));
  }
  if (problems.length) {
    console.error("Commit refused, possible secrets:\n  " + problems.join("\n  "));
    console.error("Move secrets to .env (ignored) and commit names only in .env.example.");
    Deno.exit(1);
  }
}
