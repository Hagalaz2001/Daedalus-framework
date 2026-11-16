// The one PLAN.md parser: milestones, planned dates, open and done items, blocked, late. Used by `deno task timeline`
// and by the Daedalus portfolio helpers (plan-status.mjs, report.mjs, autopilot.mjs).
import { join } from "node:path";

export interface Milestone {
  id: string;
  name: string;
  title: string;
  /** Planned dates (YYYY-MM-DD); both are optional so a plan without dates still parses. */
  start?: string;
  end?: string;
  open: number;
  done: number;
  complete: boolean;
  finishedOn?: string;
  blocked: boolean;
}
export interface Plan {
  milestones: Milestone[];
  finished: number;
  total: number;
  current?: Milestone;
  state: "needs-plan" | "done" | "blocked" | "building";
  late: boolean;
  product: string;
  start?: string;
  end?: string;
  doneItems: number;
}

/** Local date as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("sv");

/** Parses PLAN.md text. Milestone headings: `### M1 — Name · 2026-01-01 → 2026-01-14` (the dates are optional). */
export function parsePlan(text: string, now = today()): Plan {
  const plan = text.replace(/\r\n/g, "\n");
  const finishedOn = new Map([...plan.matchAll(/^- (\d{4}-\d{2}-\d{2}) (M\d+) done/gm)].map((m) => [m[2], m[1]]));
  const milestones: Milestone[] = [];
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
  const current = milestones.find((m) => !m.complete);
  const state = !planned ? "needs-plan" : !current ? "done" : current.blocked ? "blocked" : "building";
  const productLine = plan.split(/^## Product\n/m)[1]?.split("\n").find((l) => l.trim() && !l.startsWith("<!--")) ?? "";
  return {
    milestones,
    finished: milestones.filter((m) => m.complete).length,
    total: milestones.length,
    current,
    state,
    late: Boolean(current?.end && current.end < now),
    product: productLine.trim(),
    start: milestones.find((m) => m.start)?.start,
    end: [...milestones].reverse().find((m) => m.end)?.end,
    doneItems: milestones.reduce((n, m) => n + m.done, 0),
  };
}

export const readPlan = (dir: string): Plan => parsePlan(Deno.readTextFileSync(join(dir, "PLAN.md")));
