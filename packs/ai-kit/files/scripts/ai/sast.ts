// Minimal static checks for patterns AI assistants often produce. Not a replacement for a real SAST tool: run Semgrep
// or CodeQL in CI as well (see docs/AI-KIT.md). Own rules, MIT, no third-party rule text.
// Usage: `deno task sast [folder...]`. Silence one reviewed line with a comment containing `sast:allow <rule-id>`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

export interface Rule {
  id: string;
  ext: string[];
  re: RegExp;
  why: string;
}
const JS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const SECRET_WORDS = /token|secret|password|passwd|session|otp|nonce|apikey|api_key|key\b/i;

export const RULES: Rule[] = [
  { id: "js-eval", ext: JS, re: /\beval\s*\(|\bnew Function\s*\(/, why: "runs a string as code" },
  {
    id: "html-injection",
    ext: JS,
    re: /dangerouslySetInnerHTML|\.innerHTML\s*=|\bv-html\b|insertAdjacentHTML/,
    why: "unescaped HTML (XSS)",
  },
  {
    id: "shell-interpolation",
    ext: JS,
    re: /\b(exec|execSync|spawn|spawnSync)\s*\(\s*`[^`]*\$\{/,
    why: "command built from a template string (injection)",
  },
  {
    id: "sql-concat",
    ext: JS,
    re:
      /\b(query|execute|unsafe|raw)\s*\(\s*(`[^`]*\$\{[^`]*`|["'][^"']*\b(select|insert|update|delete)\b[^"']*["']\s*\+)/i,
    why: "SQL built from strings; use parameters",
  },
  {
    id: "weak-hash",
    ext: JS,
    re: /createHash\(\s*["'](md5|sha1)["']/,
    why: "broken hash; use SHA-256+ (passwords: argon2/bcrypt/scrypt)",
  },
  {
    id: "tls-verification-off",
    ext: [...JS, ".py", ".dart"],
    re:
      /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|unsafely-ignore-certificate-errors|verify\s*=\s*False|badCertificateCallback.*=>\s*true/,
    why: "disables certificate checks",
  },
  {
    id: "hardcoded-secret",
    ext: [...JS, ".py", ".dart", ".kt", ".swift"],
    re: /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\w*\s*[:=]\s*["'][A-Za-z0-9+/_\-]{12,}["']/i,
    why: "credential in source; use environment/secret store",
  },
  { id: "jwt-none", ext: JS, re: /algorithms?\s*:\s*\[?\s*["']none["']/i, why: "unsigned tokens accepted" },
  {
    id: "cors-any-origin",
    ext: JS,
    re: /origin\s*:\s*["']\*["']/,
    why: "any website can call the API; fine only for public read-only data",
  },
  {
    id: "float-money",
    ext: JS,
    re: /parseFloat\([^)]*(amount|price|balance|total)|\b(amount|price|balance|total)\w*\s*[*/]\s*\d+\.\d+/i,
    why: "money must be integer minor units",
  },
  {
    id: "insecure-random",
    ext: JS,
    re: /Math\.random\(\)/,
    why: "not cryptographic: use crypto.getRandomValues / randomUUID for tokens and ids",
    line: SECRET_WORDS,
  } as Rule & { line: RegExp },
  {
    id: "py-unsafe-load",
    ext: [".py"],
    re: /\bpickle\.loads?\(|\byaml\.load\((?![^)]*SafeLoader)|shell\s*=\s*True|\beval\(/,
    why: "unsafe deserialisation or shell",
  },
  {
    id: "c-unsafe-call",
    ext: [".c", ".h", ".cpp", ".hpp", ".cc"],
    re: /\b(gets|strcpy|strcat|sprintf|vsprintf)\s*\(/,
    why: "unbounded copy; use the n-variants or snprintf",
  },
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".dart_tool",
  ".expo",
  ".deno",
  "coverage",
  "vendor",
]);
const SKIP_FILE = /(_test\.ts|testing\.ts|\.test\.[tj]sx?|\.spec\.[tj]sx?|sast\.ts)$/;

export interface Finding {
  file: string;
  line: number;
  rule: string;
  why: string;
}

export function scanText(file: string, text: string): Finding[] {
  const ext = extname(file);
  const out: Finding[] = [];
  text.split("\n").forEach((l, i) => {
    for (const r of RULES) {
      if (!r.ext.includes(ext) || !r.re.test(l)) continue;
      const need = (r as Rule & { line?: RegExp }).line;
      if (need && !need.test(l)) continue;
      if (l.includes(`sast:allow ${r.id}`)) continue;
      out.push({ file, line: i + 1, rule: r.id, why: r.why });
    }
  });
  return out;
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(e)) yield* walk(p);
    } else if (!SKIP_FILE.test(e)) yield p;
  }
}

export function scan(roots: string[]): Finding[] {
  return roots.flatMap((r) => [...walk(r)].flatMap((f) => scanText(f.replaceAll("\\", "/"), readFileSync(f, "utf8"))));
}

if (import.meta.main) {
  const found = scan(Deno.args.length ? Deno.args : ["."]);
  for (const f of found) console.error(`${f.file}:${f.line}  ${f.rule}: ${f.why}`);
  console.log(
    found.length
      ? `${found.length} finding(s). Fix them or add "sast:allow <rule>" with a reason after human review.`
      : "sast: no findings",
  );
  Deno.exit(found.length ? 1 : 0);
}
