// Reads a project's PLAN.md: milestones with planned dates, what's done, what's next, late or blocked.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const today = () => new Date().toLocaleDateString("sv"); // local YYYY-MM-DD

export function readPlan(dir) {
  const plan = readFileSync(join(dir, "PLAN.md"), "utf8").replace(/\r\n/g, "\n");
  const finishedOn = new Map([...plan.matchAll(/^- (\d{4}-\d{2}-\d{2}) (M\d+) done/gm)].map((m) => [m[2], m[1]]));
  const milestones = [];
  for (const part of plan.split(/^### /m).slice(1)) {
    const title = part.split("\n")[0].trim();
    const head = title.match(/^(M\d+)\s*[—–:-]\s*(.+?)(?:\s*·\s*(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2}))?$/);
    if (!head) continue;
    const body = part.split(/^## /m)[0];
    const open = (body.match(/^- \[ \]/gm) ?? []).length;
    const done = (body.match(/^- \[x\]/gim) ?? []).length;
    milestones.push({
      id: head[1],
      name: head[2].trim(),
      title: `${head[1]} — ${head[2].trim()}`,
      start: head[3],
      end: head[4],
      open,
      done,
      complete: open === 0 && done > 0,
      finishedOn: finishedOn.get(head[1]),
      blocked: /^- \[ \] BLOCKED/m.test(body),
    });
  }
  const planned = !plan.includes("<!-- name -->") && !plan.includes("<!-- One paragraph") && !/· YYYY-MM-DD/.test(plan);
  const finished = milestones.filter((m) => m.complete).length;
  const current = milestones.find((m) => !m.complete);
  const late = Boolean(current?.end && current.end < today());
  const state = !planned ? "needs-plan" : !current ? "done" : current.blocked ? "blocked" : "building";
  const productLine = plan.split(/^## Product\n/m)[1]?.split("\n").find((l) => l.trim() && !l.startsWith("<!--")) ?? "";
  return {
    milestones,
    finished,
    total: milestones.length,
    current,
    state,
    late,
    product: productLine.trim(),
    start: milestones.find((m) => m.start)?.start,
    end: [...milestones].reverse().find((m) => m.end)?.end,
    doneItems: milestones.reduce((n, m) => n + m.done, 0),
  };
}

export function lastCommit(dir) {
  try {
    return execFileSync("git", ["-C", dir, "log", "-1", "--format=%cr: %s"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "no commits yet";
  }
}

export function listProjects(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "PLAN.md")))
    .map((d) => join(root, d.name));
}

export function board(root) {
  const rows = listProjects(root).map((dir) => {
    const p = readPlan(dir);
    const now =
      p.state === "needs-plan"
        ? "needs plan-project"
        : p.state === "done"
          ? "done"
          : `${p.current.title}${p.state === "blocked" ? " (BLOCKED)" : p.late ? " (LATE)" : ""}`;
    return { name: dir.split(/[\\/]/).pop(), progress: `${p.finished}/${p.total}`, due: p.end ?? "-", now, last: lastCommit(dir) };
  });
  if (rows.length === 0) return `No projects with a PLAN.md in ${root}`;
  const keys = ["name", "progress", "due", "now"];
  const w = keys.map((k) => Math.max(k.length, ...rows.map((r) => r[k].length)));
  const line = (r) => [...keys.map((k, i) => r[k].padEnd(w[i])), r.last].join("  ");
  return [line({ name: "project", progress: "done", due: "due", now: "working on", last: "last commit" }), ...rows.map(line)].join("\n");
}
