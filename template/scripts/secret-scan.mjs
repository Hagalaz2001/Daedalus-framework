// Refuses a commit that adds secrets: .env files, private keys, API keys and tokens.
// Run by .githooks/pre-commit on the staged changes; `node scripts/secret-scan.mjs --all` scans every tracked file.
import { execFileSync } from "node:child_process";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const all = process.argv.includes("--all");
const files = (all ? git("ls-files") : git("diff", "--cached", "--name-only", "--diff-filter=ACM"))
  .split("\n")
  .filter(Boolean);

const BLOCKED_FILES = [/(^|\/)\.env(\.[^/]*)?$/, /\.(pem|p12|pfx|keystore|jks)$/i, /(^|\/)id_(rsa|ed25519)$/];
const ALLOWED_FILES = [/\.env\.example$/];
const PATTERNS = [
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

const problems = [];
for (const file of files) {
  if (ALLOWED_FILES.some((r) => r.test(file))) continue;
  if (BLOCKED_FILES.some((r) => r.test(file))) {
    problems.push(`${file}: this kind of file must never be committed`);
    continue;
  }
  let text;
  try {
    text = all ? git("show", `HEAD:${file}`) : git("show", `:${file}`);
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue; // binary
  for (const [label, re] of PATTERNS) if (re.test(text)) problems.push(`${file}: looks like a ${label}`);
}

if (problems.length) {
  console.error("Commit refused, possible secrets:\n  " + problems.join("\n  "));
  console.error("Move secrets to .env (ignored) and commit names only in .env.example.");
  process.exit(1);
}
