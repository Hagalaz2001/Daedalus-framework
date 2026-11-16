// Claude Code PreToolUse hook: blocks commands and file access an AI agent must not run unattended.
// Reads the hook payload on stdin; exit code 2 plus a message on stderr blocks the tool call.
// A human approves a category for one session by starting the agent with AI_GUARD_APPROVE=deploy,git (comma list;
// categories: delete, git, deploy, secrets, sql, guard-edit). Approval comes from the process environment, never from
// the command text, so an agent cannot grant it to itself.
// This is a safety net for common mistakes, not a sandbox: obfuscated commands can get past a string check.
import { posix } from "node:path";

export interface Block {
  category: "delete" | "git" | "deploy" | "secrets" | "sql" | "guard-edit";
  reason: string;
}
export type Verdict = Block | null;

const norm = (p: string) =>
  posix.normalize(p.replaceAll("\\", "/").replace(/^([a-zA-Z]):/, (_, d) => `/${d.toLowerCase()}:`));

/** True when `target` (absolute or relative to `project`) lies strictly inside `project`. */
export function insideProject(project: string, target: string): boolean {
  const base = norm(project).replace(/\/$/, "");
  const abs = /^([a-zA-Z]:)?[\\/]/.test(target)
    ? norm(target)
    : posix.normalize(`${base}/${target.replaceAll("\\", "/")}`);
  return abs.startsWith(base + "/");
}

const HOMEISH = /^(~|\$\{?HOME\}?|\$\{?USERPROFILE\}?|%USERPROFILE%|\$env:USERPROFILE)(\/|\\|$)?/i;

/** Splits a command line into words, honouring quotes and backslash escapes. Operators become their own words. */
export function words(line: string): string[][] {
  const segments: string[][] = [];
  let cur: string[] = [];
  let w = "";
  let has = false;
  let q = "";
  const push = () => {
    if (has) cur.push(w);
    w = "";
    has = false;
  };
  const cut = () => {
    push();
    if (cur.length) segments.push(cur);
    cur = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = "";
      else if (c === "\\" && q === '"' && i + 1 < line.length) w += line[++i];
      else w += c;
    } else if (c === "'" || c === '"') {
      q = c;
      has = true;
    } else if (c === "\\" && line[i + 1] && line[i + 1] !== "\n" && !/^[a-zA-Z]:?$/.test(w)) {
      w += line[++i];
      has = true;
    } else if (c === ";" || c === "\n" || c === "|" || (c === "&" && line[i + 1] === "&" ? (i++, true) : c === "&")) {
      if (c === "|" && line[i + 1] === "|") i++;
      cut();
    } else if (/\s/.test(c)) push();
    else {
      w += c;
      has = true;
    }
  }
  cut();
  return segments;
}

const ENV_FILE = /^\.env(\..+)?$/i;
const ENV_SAFE = /\.(example|sample|template|dist)$/i;
const KEY_FILE = /(\.(pem|p12|pfx|keystore|jks|key)|^id_(rsa|ed25519|ecdsa))$/i;

export function isSecretFile(path: string): boolean {
  const base = path.replaceAll("\\", "/").split("/").pop() ?? "";
  return (ENV_FILE.test(base) && !ENV_SAFE.test(base)) || KEY_FILE.test(base);
}

const DEPLOY: [string, RegExp][] = [
  ["vercel", /^(deploy|--prod|promote|rollback|remove|rm)\b|--prod\b/],
  ["netlify", /^(deploy|rollback)/],
  ["fly", /^(deploy|destroy|apps)/],
  ["flyctl", /^(deploy|destroy|apps)/],
  ["firebase", /^(deploy|hosting:disable)/],
  ["wrangler", /^(deploy|publish|delete)/],
  ["kubectl", /^(apply|delete|replace|patch|scale|rollout|drain|cordon)/],
  ["helm", /^(install|upgrade|uninstall|rollback)/],
  ["terraform", /^(apply|destroy|import|state)/],
  ["tofu", /^(apply|destroy|import|state)/],
  ["pulumi", /^(up|destroy)/],
  ["gcloud", /(deploy|delete|create|submit)\b/],
  ["aws", /(deploy|delete|terminate|put-|create-|update-|s3 (rm|sync|mv))/],
  ["az", /(deploy|delete|create|up)\b/],
  ["supabase", /^(db (push|reset)|functions deploy|link)/],
  ["drizzle-kit", /^(push|migrate)/],
  ["docker", /^(push|system prune|volume (rm|prune)|rm -f)/],
  ["gh", /^(release|workflow run|repo (delete|create)|secret|api -X (POST|PUT|PATCH|DELETE))/i],
  ["deno", /^(publish|deploy)/],
  ["npm", /^publish/],
  ["pnpm", /^publish/],
  ["yarn", /^(npm )?publish/],
  ["eas", /^(build|submit|update)/],
  ["fastlane", /^(deploy|release|supply|pilot|upload)/],
  ["gradle", /(publish|upload)/],
  ["cargo", /^(publish|yank)/],
  ["flutter", /^(pub publish)/],
];

const stripPrefix = (t: string[]): string[] => {
  let i = 0;
  while (
    i < t.length &&
    (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i]) || ["sudo", "command", "nohup", "time", "exec", "doas"].includes(t[i]))
  ) i++;
  if (t[i] === "env") {
    i++;
    while (i < t.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[i]) || t[i].startsWith("-"))) i++;
  }
  return t.slice(i);
};

function checkSegment(t0: string[], project: string): Verdict {
  if (t0.length === 1 && t0[0] === "env") {
    return { category: "secrets", reason: "dumping the environment exposes secrets" };
  }
  const t = stripPrefix(t0);
  if (!t.length) return null;
  const cmd = (t[0].replaceAll("\\", "/").split("/").pop() ?? "").toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, "");
  const args = t.slice(1);
  const rest = args.join(" ");

  // Shells and interpreters that run a string: check the string too.
  if (["bash", "sh", "zsh", "dash", "pwsh", "powershell", "cmd"].includes(cmd)) {
    const i = args.findIndex((a) => /^(-c|-command|-encodedcommand|\/c)$/i.test(a));
    if (i >= 0 && args[i + 1]) {
      if (/encodedcommand/i.test(args[i])) {
        return { category: "deploy", reason: "encoded shell commands cannot be reviewed" };
      }
      return checkBash(args.slice(i + 1).join(" "), project);
    }
  }

  // Deleting files.
  if (["rm", "rmdir", "del", "erase", "rd", "remove-item", "ri", "unlink", "shred"].includes(cmd)) {
    const recursive = args.some((a) =>
      /^-[a-zA-Z]*[rR]/.test(a) || /^--recursive$/i.test(a) || /^-recurse$/i.test(a) || /^\/s$/i.test(a)
    );
    for (const a of args) {
      if (a.startsWith("-") || /^\/[a-z]$/i.test(a)) continue;
      if (
        HOMEISH.test(a) || a === "/" || a === "/*" || a === "." || a === "./" || a === "*" || a === ".." ||
        /^[a-zA-Z]:[\\/]?$/.test(a)
      ) {
        return { category: "delete", reason: `refusing to delete "${a}" (home, root or the whole project)` };
      }
      if (!insideProject(project, a)) return { category: "delete", reason: `"${a}" is outside the project folder` };
      if (recursive && /(^|\/)\.git(\/|$)/.test(a.replaceAll("\\", "/"))) {
        return { category: "delete", reason: "refusing to delete .git" };
      }
    }
  }

  if (cmd === "git") {
    const sub = args.find((a) => !a.startsWith("-")) ?? "";
    const after = args.slice(args.indexOf(sub) + 1);
    const has = (...f: string[]) =>
      after.some((a) => f.includes(a) || f.some((x) => x.startsWith("--") && a.startsWith(x + "=")));
    if (
      sub === "push" &&
      (has("--force", "-f", "--force-with-lease", "--mirror", "--delete", "-d") ||
        after.some((a) => /^\+|^:[^:]/.test(a)))
    ) {
      return { category: "git", reason: "force pushes and remote deletions need a human" };
    }
    if (sub === "reset" && has("--hard")) return { category: "git", reason: "git reset --hard discards work" };
    if (sub === "clean" && after.some((a) => /^-[a-z]*f/.test(a) || a === "--force")) {
      return { category: "git", reason: "git clean -f deletes untracked files" };
    }
    if (
      (sub === "checkout" || sub === "restore") && (after.includes(".") || after.includes("--") && after.includes("."))
    ) {
      return { category: "git", reason: "discarding every change in the tree" };
    }
    if (sub === "branch" && has("-D")) return { category: "git", reason: "force-deleting a branch" };
    if (
      ["commit", "push", "merge", "rebase", "am"].includes(sub) && has("--no-verify", "-n", "--no-gpg-sign") &&
      !(sub === "commit" && !has("--no-verify", "--no-gpg-sign"))
    ) {
      return { category: "git", reason: "bypassing hooks or signing" };
    }
  }

  for (const [name, re] of DEPLOY) {
    if (cmd === name && re.test(rest)) {
      return { category: "deploy", reason: `${cmd} ${args[0] ?? ""} changes shared or production state` };
    }
  }

  if (cmd === "printenv") return { category: "secrets", reason: "dumping the environment exposes secrets" };

  if (!["ls", "dir", "stat", "test", "file"].includes(cmd)) {
    for (const a of t) {
      const f = a.replace(/^\d?>>?/, "").replace(/^<+/, "");
      if (f && isSecretFile(f)) {
        return {
          category: "secrets",
          reason: `"${f}" is a secret file; a human edits it, the agent uses .env.example`,
        };
      }
    }
  }
  return null;
}

/** Checks a full shell command line. Returns null when allowed. */
export function checkBash(command: string, project: string): Verdict {
  if (
    /\b(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b|\|\s*iex\b/i.test(
      command,
    )
  ) {
    return { category: "deploy", reason: "piping a download into a shell" };
  }
  if (/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i.test(command)) {
    return { category: "sql", reason: "destructive SQL needs a human" };
  }
  if (/\bdelete\s+from\s+\w+\s*(;|"|'|$)/i.test(command)) return { category: "sql", reason: "DELETE without WHERE" };
  for (const m of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) {
    const inner = checkBash(m[1] ?? m[2], project);
    if (inner) return inner;
  }
  for (const seg of words(command)) {
    const v = checkSegment(seg, project);
    if (v) return v;
  }
  return null;
}

const PROTECTED = [
  /(^|\/)\.claude\/(settings(\.local)?\.json|hooks\/)/,
  /(^|\/)scripts\/ai\/guard(_test)?\.ts$/,
  /(^|\/)\.git\//,
];

/** Checks a file path an agent wants to read, write or edit. */
export function checkFile(path: string, project: string, mode: "read" | "write"): Verdict {
  const p = path.replaceAll("\\", "/");
  if (isSecretFile(p)) return { category: "secrets", reason: `${p} is a secret file` };
  if (mode === "write") {
    if (!insideProject(project, path)) return { category: "delete", reason: `${p} is outside the project folder` };
    if (PROTECTED.some((r) => r.test(p))) {
      return { category: "guard-edit", reason: `${p} is part of the guardrails or git internals` };
    }
  }
  return null;
}

export function decide(payload: Record<string, unknown>, approved: string[], fallbackProject: string): Verdict {
  const input = (payload.tool_input ?? {}) as Record<string, string>;
  const project = String(payload.cwd ?? fallbackProject);
  const tool = String(payload.tool_name ?? "");
  let v: Verdict = null;
  if (tool === "Bash" || tool === "PowerShell") v = checkBash(String(input.command ?? ""), project);
  else if (tool === "Read") v = checkFile(String(input.file_path ?? ""), project, "read");
  else if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) {
    v = checkFile(String(input.file_path ?? input.notebook_path ?? ""), project, "write");
  }
  return v && approved.includes(v.category) ? null : v;
}

if (import.meta.main) {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(await new Response(Deno.stdin.readable).text());
  } catch {
    Deno.exit(0); // not a hook payload: never break the agent on our own parse error
  }
  const approved = (Deno.env.get("AI_GUARD_APPROVE") ?? "").split(",").map((s) => s.trim());
  const v = decide(payload, approved, Deno.env.get("CLAUDE_PROJECT_DIR") ?? Deno.cwd());
  if (v) {
    console.error(
      `Blocked by guard (${v.category}): ${v.reason}.\nA human can run this, or restart the agent with AI_GUARD_APPROVE=${v.category}. See docs/RESPONSIBLE-AI.md.`,
    );
    Deno.exit(2);
  }
}
