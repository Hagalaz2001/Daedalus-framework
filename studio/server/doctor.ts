// `daedalus doctor`: can this computer run AI locally, and which model tier fits? Read-only: it looks at RAM, free disk,
// GPU memory and CPU features, optionally asks a Lemonade server (LEMONADE_BASE_URL) whether it is running, and prints a
// recommendation. Usage: deno run -A server/doctor.ts [--json] [--no-probe] [--lemonade-url <url>]
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assess,
  type Assessment,
  type Hardware,
  humanBytes,
  LEMONADE_DEFAULT_BASE_URL,
  MIN_FREE_DISK_GB,
  MIN_RAM_GB,
} from "../shared/localAi.ts";
import { loadEnv } from "./env.ts";
import { collectHardware } from "./hardware.ts";
import { LemonadeClient } from "./lemonade.ts";

export interface DoctorReport {
  hardware: Hardware;
  assessment: Assessment;
  lemonade: { base: string; running: boolean; version: string | null; loadedModel: string | null } | null;
}

const TIER_TEXT: Record<Assessment["tier"], string> = {
  recommended: "Recommended: local AI will run comfortably.",
  workable: "Workable: local AI runs, expect it to be slow for long pages.",
  minimum: "Minimum: it runs, slowly. Close other programs while generating.",
  "below-minimum":
    `Below the minimum (${MIN_RAM_GB} GB RAM, ${MIN_FREE_DISK_GB} GB free disk, a 64-bit CPU with AVX2): use a cloud provider instead.`,
};

export function renderDoctor(r: DoctorReport): string {
  const mark = { ok: "ok  ", warn: "warn", fail: "FAIL" } as const;
  const lines = ["Daedalus doctor: local AI", ""];
  lines.push(`System   ${r.hardware.os} ${r.hardware.arch}${r.hardware.cpu ? `, ${r.hardware.cpu}` : ""}`);
  for (const c of r.assessment.checks) lines.push(`  [${mark[c.level]}] ${c.text}`);
  lines.push("", TIER_TEXT[r.assessment.tier]);
  const m = r.assessment.model;
  if (m) {
    lines.push(
      `Model    ${m.label} (${m.licence}), download ${humanBytes(m.bytes)}, about ${humanBytes(m.runBytes)} of memory while running.`,
    );
    if (r.assessment.bestQuality === "gpu") lines.push("Optional The 27B best-quality model fits your GPU (see docs/LOCAL-AI.md).");
  } else {lines.push(`Model    none: ${
      r.assessment.reason === "close-apps"
        ? "not enough memory is free right now; close programs and run the check again"
        : "too little memory for a local model"
    }.`);}
  lines.push("");
  if (r.lemonade === null) lines.push("Lemonade not checked (--no-probe).");
  else if (r.lemonade.running) {
    lines.push(
      `Lemonade running at ${r.lemonade.base}${r.lemonade.version ? ` (version ${r.lemonade.version})` : ""}; loaded model: ${
        r.lemonade.loadedModel ?? "none"
      }.`,
    );
  } else {lines.push(
      `Lemonade not running at ${r.lemonade.base}. Install it from https://lemonade-server.ai/ and start it, then open the studio's model panel.`,
    );}
  lines.push("", "Next: deno task studio, then Model > Set up Local AI. Details: docs/LOCAL-AI.md");
  return lines.join("\n");
}

export async function runDoctor(
  args: string[],
  env: Record<string, string | undefined> = Deno.env.toObject(),
): Promise<{ report: DoctorReport; text: string; code: number }> {
  const flag = (name: string) => args.includes(`--${name}`);
  const value = (name: string) => args[args.indexOf(`--${name}`) + 1];
  const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cfg = loadEnv([join(studioDir, ".env")], env);
  const hardware = await collectHardware();
  const assessment = assess(hardware);
  let lemonade: DoctorReport["lemonade"] = null;
  if (!flag("no-probe")) {
    const client = new LemonadeClient(value("lemonade-url") ?? cfg.lemonadeBaseUrl ?? LEMONADE_DEFAULT_BASE_URL, cfg.lemonadeApiKey);
    const health = await client.health();
    lemonade = {
      base: client.base,
      running: health !== null,
      version: health?.version ?? null,
      loadedModel: health?.loaded[0]?.model ?? null,
    };
  }
  const report: DoctorReport = { hardware, assessment, lemonade };
  return {
    report,
    text: flag("json") ? JSON.stringify(report, null, 2) : renderDoctor(report),
    code: assessment.tier === "below-minimum" ? 1 : 0,
  };
}

if (import.meta.main) {
  const { text, code } = await runDoctor(Deno.args);
  console.log(text);
  Deno.exit(code);
}
