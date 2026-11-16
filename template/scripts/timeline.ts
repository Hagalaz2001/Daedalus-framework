// PLAN.md -> docs/TIMELINE.md: a Mermaid Gantt chart of the milestones (planned dates, done / active
// / late), rendered by GitLab, GitHub and VS Code. Run `deno task timeline`; next-milestone runs it too.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { type Milestone, parsePlan, today } from "./plan.ts";

/** Project name from .blueprint.json, else the folder name. */
function projectName(): string {
  try {
    const n = JSON.parse(readFileSync(".blueprint.json", "utf8")).name;
    if (typeof n === "string" && n) return n;
  } catch { /* no manifest: use the folder */ }
  return basename(resolve("."));
}

export function timeline(planText: string, project: string, now = today()): { md: string; count: number } {
  const plan = parsePlan(planText, now);
  const rows = plan.milestones.filter((m): m is Milestone & { start: string; end: string } => !!m.start && !!m.end);
  const firstOpen = rows.find((r) => r.open > 0);
  const lines = [
    "# Timeline",
    "",
    `Generated from PLAN.md on ${now} by \`deno task timeline\`. Do not edit by hand.`,
    "",
    "```mermaid",
    "gantt",
    `  title ${project}`,
    "  dateFormat YYYY-MM-DD",
    "  axisFormat %d %b",
    "  todayMarker on",
    "  section Milestones",
  ];
  for (const r of rows) {
    const state = r.complete
      ? "done, "
      : r === firstOpen
      ? (r.end < now ? "crit, active, " : "active, ")
      : r.end < now
      ? "crit, "
      : "";
    lines.push(
      `  ${r.id} ${r.name.replace(/[:#]/g, " ")}${
        r.blocked ? " (BLOCKED)" : ""
      } :${state}${r.id.toLowerCase()}, ${r.start}, ${r.end}`,
    );
  }
  lines.push("```", "", "| Milestone | Planned | Finished | Items |", "|---|---|---|---|");
  for (const r of rows) {
    lines.push(
      `| ${r.id} ${r.name} | ${r.start} → ${r.end} | ${r.finishedOn ?? (r.complete ? "yes" : "")} | ${r.done}/${
        r.done + r.open
      } |`,
    );
  }
  if (rows.length === 0) lines.push("", "_PLAN.md has no dated milestones yet (run the plan-project skill)._");
  return { md: lines.join("\n") + "\n", count: rows.length };
}

if (import.meta.main) {
  if (!existsSync("PLAN.md")) {
    console.error("PLAN.md not found: run `deno task timeline` from the project root.");
    Deno.exit(1);
  }
  const { md, count } = timeline(readFileSync("PLAN.md", "utf8"), projectName());
  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/TIMELINE.md", md);
  console.log(`docs/TIMELINE.md: ${count} milestone(s)`);
}
