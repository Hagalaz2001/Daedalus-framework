#!/usr/bin/env -S deno run -A
// Autopilot: drive every project in a folder through its PLAN.md with Claude Code, unattended.
//
//   deno run -A autopilot.mjs <folder> [--parallel 4] [--hours 8] [--only a,b] [--model opus] [--session-minutes 120]
//
// Each project runs one fresh Claude Code session per step: "plan-project" while PLAN.md is still the
// template, then "next-milestone" once per milestone, so PLAN.md (not a long conversation) is the
// memory. Up to --parallel projects run at the same time; a project stops when its plan is done, a
// milestone is BLOCKED (a decision only the owner can make), or two sessions in a row change nothing.
// Uses the person's own Claude Code sign-in and plan; nothing here touches credentials.
// Logs: <project>/.autopilot/<time>.jsonl. Stop with Ctrl+C (running sessions are stopped too).
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { board, listProjects, readPlan } from "./plan-status.mjs";
import { buildReport } from "./report.mjs";
import { readdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : fallback;
};
const parallel = Math.max(1, Number(flag("parallel", "4")));
const hours = Number(flag("hours", "8"));
const sessionMinutes = Number(flag("session-minutes", "120"));
const only = flag("only", "")?.split(",").filter(Boolean) ?? [];
const model = flag("model", "");
const developers = Number(flag("developers", "1"));
const refreshDashboard = () => {
  try {
    writeFileSync(join(root, "portfolio-report.html"), buildReport(root, { developers }));
  } catch (error) {
    console.log(`  (dashboard not updated: ${error.message})`);
  }
};
const root = args[0] && resolve(args[0]);
if (!root || !existsSync(root)) {
  console.error("Usage: deno run -A autopilot.mjs <folder with projects> [--parallel 4] [--hours 8] [--only a,b] [--model opus]");
  process.exit(1);
}
const deadline = Date.now() + hours * 3600_000;

function claudeExecutable() {
  if (process.env.AETHER_CLAUDE_CODE_PATH) return process.env.AETHER_CLAUDE_CODE_PATH;
  const dirs = (process.env.PATH ?? "").split(delimiter).concat(join(homedir(), ".local", "bin"));
  if (process.env.APPDATA) dirs.push(join(process.env.APPDATA, "npm"));
  for (const dir of dirs) {
    if (process.platform === "win32") {
      if (existsSync(join(dir, "claude.exe"))) return join(dir, "claude.exe");
      const shim = join(dir, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
      if (existsSync(join(dir, "claude.cmd")) && existsSync(shim)) return shim;
    } else if (existsSync(join(dir, "claude"))) return join(dir, "claude");
  }
  throw new Error("Claude Code isn't installed. Install it, run `claude auth login`, then start autopilot again.");
}
const claude = claudeExecutable();

const PROMPTS = {
  "needs-plan":
    "Autonomous run (no one is watching): plan this project with the plan-project skill. Make sensible assumptions instead of asking, record them under Decisions in PLAN.md, finish with deno task check passing and a commit.",
  building:
    "Autonomous run (no one is watching): continue this project with the next-milestone skill. Build exactly the first unchecked milestone in PLAN.md end to end, following the skill's autonomous-mode rules (builders in parallel in the foreground; wait for them; tick and commit each finished item), finish with deno task check passing, PLAN.md ticked, docs/QA.md and docs/REPORT.md updated (business-update skill) and a commit. Then stop.",
  deck: "Autonomous run (no one is watching): every milestone is done. Build the project deck with the project-deck skill, add a final business-update entry to docs/REPORT.md, and commit. Then stop.",
};

/**
 * Milliseconds until a plan limit resets, read from Claude Code's message ("resets 10:30am",
 * "resets 3pm"); the clock time is taken as local time. Falls back to 30 minutes; never longer
 * than the remaining budget, and at least 1 minute.
 */
function msUntilReset(message) {
  const m = message.match(/resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let wait = 30 * 60_000;
  if (m) {
    let hour = Number(m[1]) % 12;
    if ((m[3] ?? "").toLowerCase() === "pm") hour += 12;
    if (!m[3] && Number(m[1]) === 12) hour = 12;
    const reset = new Date();
    reset.setHours(hour, Number(m[2] ?? 0), 0, 0);
    // A reset time a few hours in the past already happened (the message is older than now): retry
    // shortly. Only a time far in the past means tomorrow.
    if (reset.getTime() <= Date.now() && Date.now() - reset.getTime() > 6 * 3600_000) reset.setDate(reset.getDate() + 1);
    wait = reset.getTime() <= Date.now() ? 60_000 : reset.getTime() - Date.now() + 60_000; // a minute of slack
  }
  return Math.max(60_000, Math.min(wait, deadline - Date.now()));
}

// Commits and uncommitted changes count as progress too (a long milestone may tick nothing yet).
function workFingerprint(dir) {
  const g = (...a) => {
    try {
      return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return "";
    }
  };
  return `${g("rev-parse", "HEAD").trim()}|${g("status", "--porcelain").length}|${g("diff", "--stat").trim().split(/\n/).pop()}`;
}

const running = new Set();
const deckTried = new Set();
const stopAll = () => {
  for (const child of running) killTree(child);
};
process.on("SIGINT", () => {
  console.log("\nStopping autopilot…");
  stopAll();
  process.exit(130);
});

function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  else child.kill("SIGTERM");
}

function runSession(dir, prompt) {
  return new Promise((resolveRun) => {
    const logDir = join(dir, ".autopilot");
    mkdirSync(logDir, { recursive: true });
    const log = join(logDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
    const argv = ["-p", "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"];
    if (model) argv.push("--model", model);
    const env = { ...process.env };
    for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "CLAUDECODE"]) delete env[k];
    const child = spawn(claude, argv, { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    running.add(child);
    child.stdin.end(prompt);
    let result = null;
    let tail = "";
    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      appendFileSync(log, text);
      tail = (tail + text).slice(-20_000);
      for (const line of text.split("\n")) {
        if (!line.startsWith('{"type":"result"')) continue;
        try {
          result = JSON.parse(line);
        } catch {
          // partial line; the full one is in the log
        }
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (c) => appendFileSync(log, c));
    const timer = setTimeout(() => killTree(child), sessionMinutes * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      running.delete(child);
      if (!result) {
        const m = tail.match(/"type":"result"[^\n]*/);
        if (m) try { result = JSON.parse(m[0].startsWith("{") ? m[0] : `{${m[0]}`); } catch {}
      }
      resolveRun({ code, result, log });
    });
  });
}

const RETRYABLE = /403|overloaded|rate.?limit|network|ECONNRESET|ETIMEDOUT|5\d\d/i;

async function driveProject(dir) {
  const name = dir.split(/[\\/]/).pop();
  let stalls = 0;
  let retries = 0;
  while (Date.now() < deadline) {
    const before = readPlan(dir);
    const beforeWork = workFingerprint(dir);
    if (before.state === "done") {
      const deckDir = join(dir, "docs", "deck");
      const hasDeck = existsSync(deckDir) && readdirSync(deckDir).some((f) => f.endsWith(".pptx"));
      if (!hasDeck && !deckTried.has(dir)) {
        deckTried.add(dir);
        console.log(`▶ ${name}: building the project deck`);
        await runSession(dir, PROMPTS.deck);
        refreshDashboard();
      }
      return console.log(`✔ ${name}: every milestone done${hasDeck || deckTried.has(dir) ? ", deck in docs/deck/" : ""}`);
    }
    if (before.state === "blocked") return console.log(`■ ${name}: blocked at ${before.current.title}; needs your decision (see PLAN.md)`);
    const step = before.state === "needs-plan" ? "planning" : before.current.title;
    console.log(`▶ ${name}: ${step}`);
    const t0 = Date.now();
    const { result, log } = await runSession(dir, PROMPTS[before.state]);
    const minutes = ((Date.now() - t0) / 60000).toFixed(1);
    const after = readPlan(dir);
    // The plan's usage limit (Claude's 5-hour / weekly windows): pause until it resets, then carry
    // on. This is not a stall and not a failure; every project shares the same plan.
    const limitText = `${result?.api_error ?? ""} ${result?.result ?? ""}`;
    if (result?.api_error === "usage_limit_reached" || /hit your .*limit/i.test(limitText)) {
      const waitMs = msUntilReset(String(result?.result ?? ""));
      const until = new Date(Date.now() + waitMs);
      console.log(`  ${name}: Claude plan limit reached (${String(result?.result ?? "").slice(0, 80)}). Pausing until ${until.toLocaleTimeString()}.`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    const failed = !result || result.is_error;
    if (failed) {
      const why = String(result?.result ?? result?.subtype ?? "no result (see log)").slice(0, 200);
      if (RETRYABLE.test(why) && retries < 3) {
        retries += 1;
        console.log(`  ${name}: ${why} — retrying in 2 min (${retries}/3)`);
        await new Promise((r) => setTimeout(r, 120_000));
        continue;
      }
      console.log(`✖ ${name}: session failed after ${minutes} min: ${why}\n  log: ${log}`);
    }
    retries = 0;
    const progressed = after.state !== before.state || after.doneItems > before.doneItems || workFingerprint(dir) !== beforeWork;
    stalls = progressed ? 0 : stalls + 1;
    console.log(`  ${name}: ${progressed ? "progress" : "no change"} in ${minutes} min (${after.finished}/${after.total} milestones)`);
    refreshDashboard();
    if (stalls >= 2) return console.log(`■ ${name}: two sessions without progress; stopping. Last log: ${log}`);
  }
  console.log(`⏱ ${name}: time budget used up`);
}

const projects = listProjects(root).filter((dir) => only.length === 0 || only.includes(dir.split(/[\\/]/).pop()));
refreshDashboard();
console.log(`Dashboard: ${join(root, "portfolio-report.html")} (refreshed after every session)`);
console.log(`Autopilot: ${projects.length} project(s), ${parallel} at a time, ${hours} h budget, Claude Code: ${claude}\n`);
console.log(board(root) + "\n");
const queue = [...projects];
await Promise.all(
  Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    for (let dir = queue.shift(); dir; dir = queue.shift()) await driveProject(dir);
  }),
);
console.log("\n" + board(root));
