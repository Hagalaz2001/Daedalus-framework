// Export: pick the app and feature, review the generated code as a diff, write it, then run the project's own check.
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, cn, Input } from "../kit.tsx";
import { designApi, type ExportResult, type PlanView, type StudioConfig } from "./designApi.ts";

const pascal = (s: string) =>
  s.split(/[^a-z0-9]+/i).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");

export function ExportPanel({ config, slug, file, onPlan, applied }: {
  config: StudioConfig;
  slug: string;
  file: string;
  /** Opens the review dialog for the plan; resolves with the written files once the developer confirmed. */
  onPlan: (plan: PlanView, title: string) => Promise<string[] | null>;
  applied: number;
}) {
  const [app, setApp] = useState(0);
  const [feature, setFeature] = useState(slug.split("-")[0] ?? "home");
  const [screen, setScreen] = useState(`${pascal(slug)}Screen`);
  const [shots, setShots] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [written, setWritten] = useState<string[] | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; output: string } | "running" | null>(null);

  useEffect(() => {
    setFeature(slug.split("-")[0] ?? "home");
    setScreen(`${pascal(slug)}Screen`);
    setResult(null);
    setWritten(null);
    setCheck(null);
  }, [slug]);
  useEffect(() => {
    setResult(null);
  }, [file, applied]);

  const prepare = async (force: boolean) => {
    setBusy(true);
    setError(null);
    setWritten(null);
    setCheck(null);
    try {
      const out = await designApi.prepareExport({ slug, file, app, feature, screen, screenshots: shots, force });
      setResult(out);
      if (out.plan) {
        setBusy(false);
        const files = await onPlan(out.plan, `Export ${screen} to ${config.apps[app]?.name ?? "app"}`);
        if (files) setWritten(files);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setCheck("running");
    try {
      setCheck(await designApi.check());
    } catch (e) {
      setCheck({ ok: false, output: e instanceof Error ? e.message : String(e) });
    }
  };

  if (config.apps.length === 0) {
    return (
      <p className="p-4 text-ui-sm text-foreground-subtle">
        This project has no app yet. Generate it with a web or mobile stack, then export screens into it.
      </p>
    );
  }
  const target = config.apps[app];
  const hardBlock = result?.blocked.some((b) => b.id === "lorem-ipsum");
  return (
    <div className="flex flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="exp-app" className="text-ui-xs font-medium text-foreground-subtle">App</label>
        <select id="exp-app" value={app} onChange={(e) => setApp(Number(e.target.value))} className="ds-field">
          {config.apps.map((a, i) => <option key={`${a.stack}-${a.dir}`} value={i}>{a.name} ({a.dir})</option>)}
        </select>
        <p className="text-ui-xs text-foreground-subtle">
          {target?.exportLabel ?? `${target?.stack} (no export target yet)`}. The translator uses the stack's UI kit and
          tokens only.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-ui-xs font-medium text-foreground-subtle">
          Feature folder<Input value={feature} onChange={(e) => setFeature(e.target.value.toLowerCase())} />
        </label>
        <label className="flex flex-col gap-1.5 text-ui-xs font-medium text-foreground-subtle">
          Screen name<Input value={screen} onChange={(e) => setScreen(e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-ui-sm">
        <input type="checkbox" checked={shots} onChange={(e) => setShots(e.target.checked)} />
        Add screenshots to docs/screenshots (phone, tablet, desktop, light and dark)
      </label>
      <Button disabled={busy} onClick={() => void prepare(false)}>
        {busy
          ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />Preparing...
            </>
          )
          : "Review export"}
      </Button>
      {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}

      {result?.blocked.length
        ? (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 p-3" role="alert">
            <p className="text-ui-sm font-medium text-destructive">Export is blocked by design checks</p>
            <ul className="flex flex-col gap-1 text-ui-xs">
              {result.blocked.map((b) => <li key={b.id}>{b.message}</li>)}
            </ul>
            {hardBlock
              ? (
                <p className="text-ui-xs text-foreground-subtle">
                  Placeholder copy cannot be exported. Fix it in the Checks tab.
                </p>
              )
              : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void prepare(true)}>
                  Export anyway
                </Button>
              )}
          </div>
        )
        : null}
      {result?.codeIssues.length
        ? (
          <div className="flex flex-col gap-1 rounded-lg border border-warn/50 p-3 text-ui-xs">
            <p className="text-ui-sm font-medium text-warn">The translation needs a look</p>
            {result.codeIssues.map((c) => <p key={c.id}>{c.message}</p>)}
          </div>
        )
        : null}
      {result?.notes.map((n) => <p key={n} className="text-ui-xs text-foreground-subtle">{n}</p>)}

      {written
        ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-ui-sm font-medium">
              <CircleCheck className="size-4 text-ok" aria-hidden />Wrote {written.length}{" "}
              {written.length === 1 ? "file" : "files"}
            </p>
            <ul className="font-mono text-ui-xs text-foreground-subtle">
              {written.map((w) => <li key={w} className="break-all">{w}</li>)}
            </ul>
            <Button size="sm" variant="outline" disabled={check === "running"} onClick={() => void runCheck()}>
              {check === "running" ? "Running deno task check..." : "Run deno task check"}
            </Button>
            {check && check !== "running"
              ? (
                <div className="flex flex-col gap-1.5">
                  <p
                    className={cn(
                      "flex items-center gap-2 text-ui-sm font-medium",
                      check.ok ? "text-ok" : "text-destructive",
                    )}
                  >
                    {check.ok
                      ? <CircleCheck className="size-4" aria-hidden />
                      : <CircleX className="size-4" aria-hidden />}
                    {check.ok ? "Checks passed" : "Checks failed"}
                  </p>
                  <pre className="m-0 max-h-56 overflow-auto rounded-md bg-background-alt p-2 font-mono text-[11px] leading-4">{check.output || "(no output)"}</pre>
                </div>
              )
              : null}
          </div>
        )
        : null}
    </div>
  );
}
