// Supply-chain rules for GitHub Actions files, so a later edit cannot quietly weaken the pipeline:
//   - every `uses:` of a third-party action is pinned to a full 40-character commit SHA (a tag can be moved, a SHA cannot);
//     Docker images are pinned by digest; local actions (./...) are fine
//   - every workflow declares top-level `permissions:` (least privilege, read-only by default)
//   - no `pull_request_target` trigger (it runs with secrets on code from forks)
// `deno task lint:workflows`. A line containing `lint-workflows:allow` is skipped.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SHA = /@[0-9a-f]{40}$/;

export function scanWorkflowText(file: string, text: string, isWorkflow: boolean): string[] {
  const problems: string[] = [];
  text.split("\n").forEach((line, i) => {
    if (line.includes("lint-workflows:allow") || /^\s*#/.test(line)) return;
    const m = /^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)/.exec(line);
    if (m) {
      const ref = m[1];
      if (ref.startsWith("./")) return;
      const ok = ref.startsWith("docker://") ? /@sha256:[0-9a-f]{64}$/.test(ref) : SHA.test(ref);
      if (!ok) {
        problems.push(
          `${file}:${i + 1}: \`${ref}\` must be pinned to a full commit SHA (docker images: a sha256 digest)`,
        );
      }
    }
    if (isWorkflow && /^\s*pull_request_target\s*:/.test(line)) {
      problems.push(`${file}:${i + 1}: pull_request_target runs fork code with secrets`);
    }
  });
  if (isWorkflow && !/^permissions:/m.test(text)) {
    problems.push(`${file}: no top-level \`permissions:\` (declare the least the jobs need, usually contents: read)`);
  }
  return problems;
}

/** Scans `<root>/.github/workflows/*.yml` and `<root>/.github/actions/*\/action.yml`. */
export function scanWorkflows(root = "."): string[] {
  const problems: string[] = [];
  const wf = join(root, ".github/workflows");
  if (existsSync(wf)) {
    for (const f of readdirSync(wf).filter((n) => /\.ya?ml$/.test(n))) {
      problems.push(...scanWorkflowText(`${wf}/${f}`, readFileSync(join(wf, f), "utf8"), true));
    }
  }
  const actions = join(root, ".github/actions");
  if (existsSync(actions)) {
    for (const d of readdirSync(actions, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      for (const n of ["action.yml", "action.yaml"]) {
        const f = join(actions, d.name, n);
        if (existsSync(f)) problems.push(...scanWorkflowText(f, readFileSync(f, "utf8"), false));
      }
    }
  }
  return problems.map((p) => p.replaceAll("\\", "/"));
}

if (import.meta.main) {
  const problems = scanWorkflows(".");
  if (problems.length) {
    console.error(`lint:workflows failed:\n  ${problems.join("\n  ")}`);
    Deno.exit(1);
  }
  console.log("lint:workflows ok.");
}
