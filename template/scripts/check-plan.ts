// What `deno task check` must run for the backend and for each app. Pure so it can be tested: a backend or an app that
// would contribute no checks is an error, never a silent skip.
export interface PlanApp {
  dir: string;
  check: { cwd: string; run: string }[];
}
export interface Step {
  cwd: string;
  cmd: string;
}

/** Backend steps from backend/deno.json (preferred) or backend/package.json scripts. `null` texts mean the file is absent. */
export function backendSteps(hasBackend: boolean, denoJson: string | null, packageJson: string | null): Step[] {
  if (!hasBackend) return [];
  const tasks = denoJson ? (JSON.parse(denoJson).tasks ?? {}) as Record<string, string> : {};
  if (tasks.check) return [{ cwd: "backend", cmd: "deno task check" }];
  const scripts = packageJson ? (JSON.parse(packageJson).scripts ?? {}) as Record<string, string> : {};
  const steps = ["typecheck", "lint", "test", "build"].filter((s) => scripts[s]).map((s) => ({ cwd: "backend", cmd: `deno task ${s}` }));
  if (!steps.length) throw new Error("The project has a backend but backend/deno.json defines no `check` task: it would be skipped silently");
  return steps;
}

/** Every app must declare at least one check command. */
export function appSteps(apps: PlanApp[]): Step[] {
  return apps.flatMap((a) => {
    if (!a.check.length) throw new Error(`App ${a.dir} declares no check commands in .blueprint.json: it would be skipped silently`);
    return a.check.map((c) => ({ cwd: c.cwd, cmd: c.run }));
  });
}
