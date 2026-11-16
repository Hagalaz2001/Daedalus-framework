// PLAN.md -> docs/TIMELINE.md: a Mermaid Gantt chart of the milestones (planned dates, done / active
// / late), rendered by GitLab, GitHub and VS Code. Run `deno task timeline`; next-milestone runs it too.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const plan = readFileSync("PLAN.md", "utf8").replace(/\r\n/g, "\n");
const project = JSON.parse(readFileSync("package.json", "utf8")).name ?? "project";
const today = new Date().toLocaleDateString("sv"); // local YYYY-MM-DD
const doneDates = new Map(
  [...plan.matchAll(/^- (\d{4}-\d{2}-\d{2}) (M\d+) done/gm)].map((m) => [m[2], m[1]]),
);

const rows = [];
for (const part of plan.split(/^### /m).slice(1)) {
  const head = part.split("\n")[0];
  const m = head.match(/^(M\d+)\s*[—–:-]\s*(.+?)\s*·\s*(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) continue;
  const body = part.split(/^## /m)[0];
  const open = (body.match(/^- \[ \]/gm) ?? []).length;
  const done = (body.match(/^- \[x\]/gim) ?? []).length;
  rows.push({ id: m[1], name: m[2].replace(/[:#]/g, " "), start: m[3], end: m[4], open, done, blocked: /^- \[ \] BLOCKED/m.test(body) });
}

const firstOpen = rows.find((r) => r.open > 0);
const lines = [
  "# Timeline",
  "",
  `Generated from PLAN.md on ${today} by \`deno task timeline\`. Do not edit by hand.`,
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
  const state =
    r.open === 0 && r.done > 0 ? "done, " : r === firstOpen ? (r.end < today ? "crit, active, " : "active, ") : r.end < today ? "crit, " : "";
  lines.push(`  ${r.id} ${r.name}${r.blocked ? " (BLOCKED)" : ""} :${state}${r.id.toLowerCase()}, ${r.start}, ${r.end}`);
}
lines.push("```", "", "| Milestone | Planned | Finished | Items |", "|---|---|---|---|");
for (const r of rows) {
  lines.push(`| ${r.id} ${r.name} | ${r.start} → ${r.end} | ${doneDates.get(r.id) ?? (r.open === 0 && r.done > 0 ? "yes" : "")} | ${r.done}/${r.done + r.open} |`);
}
if (rows.length === 0) lines.push("", "_PLAN.md has no dated milestones yet (run the plan-project skill)._");
mkdirSync("docs", { recursive: true });
writeFileSync("docs/TIMELINE.md", lines.join("\n") + "\n");
console.log(`docs/TIMELINE.md: ${rows.length} milestone(s)`);
