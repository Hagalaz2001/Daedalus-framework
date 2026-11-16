// Makes a failed generator run readable without access to the raw CI logs.
//   deno run -A tools/ci-report.ts <result.json from `daedalus new --json`> <project dir>
// Prints every failed step with the tail of its output (and, when the project's own check failed, re-runs
// `deno task check --json` to list each failing check), appends the same text to $GITHUB_STEP_SUMMARY, and exits 1.
import { readFileSync } from "node:fs";

interface Step {
  cmd: string;
  cwd: string;
  ok: boolean;
  tail?: string;
}

const [resultFile, projectDir] = Deno.args;
const lines: string[] = [];
const say = (s: string) => {
  console.log(s);
  lines.push(s);
};

let result: { ok: boolean; error?: { kind: string; message: string }; steps?: Step[] };
try {
  result = JSON.parse(readFileSync(resultFile, "utf8"));
} catch {
  console.log(`No JSON result in ${resultFile}; the generator crashed before reporting. Raw file:\n${Deno.readTextFileSync(resultFile).slice(-3000)}`);
  Deno.exit(1);
}

if (result.ok) {
  console.log("Generated and checked: ok");
  Deno.exit(0);
}

say(`### Generator failed: ${result.error?.kind ?? "unknown"}: ${result.error?.message ?? ""}`);
for (const s of (result.steps ?? []).filter((x) => !x.ok)) say(`\n#### Step failed: ${s.cmd}\n(in ${s.cwd})\n\`\`\`\n${s.tail ?? ""}\n\`\`\``);

if ((result.steps ?? []).some((s) => !s.ok && s.cmd.startsWith("deno task check"))) {
  const r = new Deno.Command(Deno.execPath(), { args: ["task", "check", "--json"], cwd: projectDir, stdout: "piped", stderr: "null" }).outputSync();
  const text = new TextDecoder().decode(r.stdout);
  try {
    const report = JSON.parse(text.slice(text.indexOf("{"))) as { steps: Step[] };
    for (const s of report.steps.filter((x) => !x.ok)) say(`\n#### Check failed: ${s.cmd}\n(in ${s.cwd})\n\`\`\`\n${s.tail ?? ""}\n\`\`\``);
  } catch {
    say("The project check produced no JSON report.");
  }
}

const summary = Deno.env.get("GITHUB_STEP_SUMMARY");
if (summary) Deno.writeTextFileSync(summary, lines.join("\n") + "\n", { append: true });
Deno.exit(1);
