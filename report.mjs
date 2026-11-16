// Project dashboard: one self-contained HTML page across every project in a folder.
// Gantt timeline (planned milestones, done / current / late), each project's latest plain-language
// status from docs/REPORT.md, open bugs by impact from docs/QA.md, and team capacity.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lastCommit, listProjects, readPlan } from "./plan-status.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const day = 86_400_000;
const toMs = (d) => Date.parse(`${d}T00:00:00Z`);

function readReport(dir) {
  const file = join(dir, "docs", "REPORT.md");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const entry = text.split(/^## /m)[1];
  if (!entry) return null;
  const headline = entry.split("\n")[0].trim();
  const field = (name) => entry.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`))?.[1]?.trim() ?? "";
  return { headline, status: field("Status"), done: field("Done since last update"), risks: field("Risks"), decisions: field("Decisions needed from you"), next: field("Next") };
}

function readQa(dir) {
  const file = join(dir, "docs", "QA.md");
  const counts = { open: 0, fixed: 0, blocking: 0 };
  if (!existsSync(file)) return counts;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (!/^B\d+$/.test(cells[1] ?? "")) continue;
    const status = cells[5] ?? "";
    if (/^fixed/i.test(status)) counts.fixed += 1;
    else {
      counts.open += 1;
      if (/blocks/i.test(cells[4] ?? "")) counts.blocking += 1;
    }
  }
  return counts;
}

function statusOf(p, report) {
  if (p.state === "done") return ["Done", "done"];
  if (p.state === "needs-plan") return ["Not planned yet", "idle"];
  if (p.state === "blocked") return ["Waiting on a decision", "late"];
  const said = report?.status?.split(/\s+—|\s+-\s/)[0]?.trim();
  if (/late/i.test(said ?? "") || p.late) return ["Late", "late"];
  if (/risk/i.test(said ?? "")) return ["At risk", "risk"];
  return ["On track", "ok"];
}

const bullets = (text) =>
  text && !/^[-*]?\s*none\.?$/i.test(text.trim())
    ? `<ul>${text.split("\n").map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
    : `<p class="muted">None</p>`;

export function buildReport(root, { developers = 1, title = "Projects" } = {}) {
  const today = new Date().toLocaleDateString("sv"); // local YYYY-MM-DD
  const projects = listProjects(root).map((dir) => {
    const plan = readPlan(dir);
    const report = readReport(dir);
    return { name: dir.split(/[\\/]/).pop(), dir, plan, report, qa: readQa(dir), last: lastCommit(dir), status: statusOf(plan, report) };
  });
  const active = projects.filter((p) => p.plan.state !== "done").length;
  const counts = Object.groupBy ? Object.groupBy(projects, (p) => p.status[1]) : {};
  const capacity = developers * 2;

  // Gantt geometry
  const dated = projects.flatMap((p) => p.plan.milestones.filter((m) => m.start && m.end));
  const minMs = Math.min(toMs(today), ...dated.map((m) => toMs(m.start)));
  const maxMs = Math.max(toMs(today) + 7 * day, ...dated.map((m) => toMs(m.end) + day));
  const width = 900;
  const label = 170;
  const rowH = 34;
  const x = (ms) => label + ((ms - minMs) / (maxMs - minMs)) * (width - label - 10);
  const weeks = [];
  for (let ms = minMs - ((new Date(minMs).getUTCDay() + 6) % 7) * day; ms < maxMs; ms += 7 * day) if (ms >= minMs) weeks.push(ms);
  const height = 30 + projects.length * rowH + 10;
  const svg = [
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Timeline of all projects">`,
    ...weeks.map((ms) => `<line x1="${x(ms)}" x2="${x(ms)}" y1="22" y2="${height - 6}" class="grid"/><text x="${x(ms) + 3}" y="15" class="axis">${new Date(ms).toISOString().slice(5, 10)}</text>`),
    ...projects.map((p, i) => {
      const y = 30 + i * rowH;
      const bars = p.plan.milestones
        .filter((m) => m.start && m.end)
        .map((m) => {
          const cls = m.complete ? "b-done" : m === p.plan.current ? (p.plan.late || p.plan.state === "blocked" ? "b-late" : "b-now") : m.end < today ? "b-late" : "b-next";
          const x1 = x(toMs(m.start));
          const w = Math.max(4, x(toMs(m.end) + day) - x1 - 2);
          return `<g><title>${esc(`${p.name}: ${m.title} (${m.start} → ${m.end})${m.finishedOn ? `, finished ${m.finishedOn}` : ""}`)}</title><rect x="${x1}" y="${y + 6}" width="${w}" height="${rowH - 14}" rx="4" class="${cls}"/>${w > 34 ? `<text x="${x1 + 6}" y="${y + rowH / 2 + 4}" class="bar">${esc(m.id)}</text>` : ""}</g>`;
        })
        .join("");
      return `<text x="0" y="${y + rowH / 2 + 4}" class="name">${esc(p.name)}</text>${bars}`;
    }),
    `<line x1="${x(toMs(today))}" x2="${x(toMs(today))}" y1="20" y2="${height - 4}" class="today"/><text x="${x(toMs(today)) + 4}" y="${height - 6}" class="axis">today</text>`,
    `</svg>`,
  ].join("");

  const cards = projects
    .map((p) => {
      const r = p.report;
      const current = p.plan.current;
      return `<article class="card">
  <header><h3>${esc(p.name)}</h3><span class="pill ${p.status[1]}">${esc(p.status[0])}</span></header>
  <p class="product">${esc(p.plan.product || "No product description yet.")}</p>
  <p class="headline">${esc(r?.headline ?? "No progress report yet.")}</p>
  <dl>
    <dt>Progress</dt><dd>${p.plan.finished} of ${p.plan.total} milestones${current ? ` · now: ${esc(current.title)}${current.end ? ` (due ${current.end})` : ""}` : ""}</dd>
    <dt>Planned finish</dt><dd>${esc(p.plan.end ?? "not planned")}</dd>
    <dt>Bugs</dt><dd>${p.qa.open} open${p.qa.blocking ? ` (<strong>${p.qa.blocking} blocking</strong>)` : ""}, ${p.qa.fixed} fixed</dd>
    <dt>Last change</dt><dd>${esc(p.last)}</dd>
  </dl>
  <h4>Decisions needed</h4>${bullets(r?.decisions)}
  <h4>Risks</h4>${bullets(r?.risks)}
  <h4>Next</h4><p>${esc(r?.next || (current ? current.title : "—"))}</p>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} timeline</title>
<style>
:root{--bg:#f8fafc;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#e2e8f0;--done:#16a34a;--now:#2563eb;--late:#dc2626;--next:#cbd5e1;--risk:#d97706}
@media (prefers-color-scheme:dark){:root{--bg:#0b1120;--card:#111827;--text:#e5e7eb;--muted:#94a3b8;--line:#1f2937;--next:#334155}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 10px}
.muted{color:var(--muted)}.summary{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px}
.stat b{font-size:20px;display:block}.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;overflow-x:auto}
svg{min-width:640px;width:100%;height:auto}.grid{stroke:var(--line)}.axis{fill:var(--muted);font-size:11px}.name{fill:var(--text);font-size:13px;font-weight:600}
.bar{fill:#fff;font-size:11px;font-weight:600}.today{stroke:var(--late);stroke-width:1.5;stroke-dasharray:4 3}
.b-done{fill:var(--done)}.b-now{fill:var(--now)}.b-late{fill:var(--late)}.b-next{fill:var(--next)}
.legend{display:flex;gap:14px;font-size:13px;color:var(--muted);margin-top:6px}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
.card header{display:flex;justify-content:space-between;align-items:center;gap:8px}.card h3{margin:0;font-size:16px}.card h4{margin:12px 0 4px;font-size:13px;color:var(--muted)}
.product{color:var(--muted);margin:4px 0}.headline{font-weight:600;margin:6px 0}dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0;font-size:14px}dt{color:var(--muted)}dd{margin:0}
ul{margin:0;padding-left:18px}.pill{font-size:12px;font-weight:600;border-radius:999px;padding:2px 10px;color:#fff;white-space:nowrap}
.pill.ok{background:var(--now)}.pill.done{background:var(--done)}.pill.late{background:var(--late)}.pill.risk{background:var(--risk)}.pill.idle{background:var(--muted)}
</style></head><body><main>
<h1>${esc(title)}</h1>
<p class="muted">Updated ${today}. Generated from each project's plan, progress report and quality log.</p>
<div class="summary">
  <div class="stat"><b>${projects.length}</b>projects</div>
  <div class="stat"><b>${counts.ok?.length ?? 0}</b>on track</div>
  <div class="stat"><b>${(counts.risk?.length ?? 0) + (counts.late?.length ?? 0)}</b>at risk or late</div>
  <div class="stat"><b>${counts.done?.length ?? 0}</b>done</div>
  <div class="stat"><b>${active} / ${capacity}</b>active vs team capacity (${developers} developer${developers === 1 ? "" : "s"} × 2 projects per 2–4 weeks)</div>
</div>
<h2>Timeline</h2>
<div class="panel">${dated.length ? svg : '<p class="muted">No dated milestones yet.</p>'}
<div class="legend"><span><i style="background:var(--done)"></i>Done</span><span><i style="background:var(--now)"></i>In progress</span><span><i style="background:var(--late)"></i>Late or blocked</span><span><i style="background:var(--next)"></i>Planned</span></div></div>
<h2>Projects</h2>
<div class="cards">${cards}</div>
</main><script>
// On narrow screens the timeline scrolls; open it at today rather than at the oldest milestone.
const panel=document.querySelector(".panel"),line=document.querySelector(".today");
if(panel&&line&&panel.scrollWidth>panel.clientWidth){const svg=panel.querySelector("svg");const r=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;panel.scrollLeft=Math.max(0,line.x1.baseVal.value*r-panel.clientWidth*0.6);}
</script></body></html>`;
}
