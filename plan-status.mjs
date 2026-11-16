// Reads a project's PLAN.md: milestones with planned dates, what's done, what's next, late or blocked.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export { readPlan } from "./template/scripts/plan.ts";
import { readPlan } from "./template/scripts/plan.ts";

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
