import { assertEquals } from "jsr:@std/assert@1";
import { parsePlan } from "./plan.ts";
import { timeline } from "./timeline.ts";

const SAMPLE = `# Plan

## Product

Acme Notes keeps notes.

## Milestones

### M1 — Foundation · 2026-01-01 → 2026-01-14
- [x] contract
- [x] backend
- 2026-01-10 M1 done

### M2 — Screens · 2026-01-15 → 2026-01-31
- [x] list
- [ ] BLOCKED waiting for design
- [ ] detail

### M3 — Polish
- [ ] copy
`;

Deno.test("parsePlan reads milestones, dates and counts", () => {
  const p = parsePlan(SAMPLE, "2026-02-05");
  assertEquals(p.milestones.map((m) => [m.id, m.open, m.done, m.complete]), [["M1", 0, 2, true], ["M2", 2, 1, false], [
    "M3",
    1,
    0,
    false,
  ]]);
  assertEquals([p.milestones[0].start, p.milestones[0].end, p.milestones[0].finishedOn], [
    "2026-01-01",
    "2026-01-14",
    "2026-01-10",
  ]);
  assertEquals(p.milestones[2].start, undefined); // dates are optional
  assertEquals([p.finished, p.total, p.current?.id, p.state, p.late], [1, 3, "M2", "blocked", true]);
  assertEquals([p.start, p.end, p.product], ["2026-01-01", "2026-01-31", "Acme Notes keeps notes."]);
});

Deno.test("an unfilled template is needs-plan", () => {
  assertEquals(
    parsePlan("## Milestones\n### M1 — Foundation · YYYY-MM-DD → YYYY-MM-DD\n- [ ] x\n").state,
    "needs-plan",
  );
});

Deno.test("timeline renders dated milestones only", () => {
  const { md, count } = timeline(SAMPLE, "Acme", "2026-02-05");
  assertEquals(count, 2);
  assertEquals(md.includes("M1 Foundation :done, m1, 2026-01-01, 2026-01-14"), true);
  assertEquals(md.includes("M2 Screens (BLOCKED) :crit, active, m2, 2026-01-15, 2026-01-31"), true);
  assertEquals(md.includes("| M1 Foundation | 2026-01-01 → 2026-01-14 | 2026-01-10 | 2/2 |"), true);
});
