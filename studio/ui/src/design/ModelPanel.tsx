// Model panel: which AI writes the designs, and one-click Local AI set-up for people without a cloud subscription.
import { CircleAlert, CircleCheck, Cpu, ExternalLink, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, cn } from "../kit.tsx";
import { designApi as api, type LocalAiStatus, type LocalProgress, type ProviderState } from "./designApi.ts";

const GB = 1024 ** 3;
const gb = (bytes: number) => `${Math.round((bytes / GB) * 10) / 10} GB`;
const TIER: Record<LocalAiStatus["assessment"]["tier"], { label: string; tone: string }> = {
  recommended: { label: "Recommended", tone: "text-ok" },
  workable: { label: "Workable", tone: "text-ok" },
  minimum: { label: "Minimum", tone: "text-warn" },
  "below-minimum": { label: "Below the minimum", tone: "text-destructive" },
};
const STAGE: Record<LocalProgress["stage"], string> = {
  registering: "Registering the model...",
  downloading: "Downloading",
  loading: "Loading into memory...",
  checking: "Checking it answers sensibly...",
  done: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function ModelPanel({ state, progress, onChange, onClose }: {
  state: ProviderState;
  /** Latest progress pushed by the server (also readable from the status call). */
  progress: LocalProgress | null;
  onChange: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.localAi.status().then(setStatus, (e) => setError(String(e.message ?? e))), []);
  useEffect(() => {
    void load();
  }, [load, progress?.stage]);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
      await load();
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const live = progress ?? status?.progress ?? null;
  const working = live && ["registering", "downloading", "loading", "checking"].includes(live.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="AI model">
      <div className="flex h-full w-full max-w-[460px] flex-col border-l border-border bg-panel shadow-[var(--shadow)]">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <h2 className="text-ui-base font-semibold">AI model</h2>
          <Button className="ml-auto" size="sm" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-ui-xs font-semibold uppercase tracking-wide text-foreground-subtle">Use</h3>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3",
                state.selected === "auto" && "border-brand",
              )}
            >
              <input
                type="radio"
                name="provider"
                checked={state.selected === "auto"}
                onChange={() => void run(() => api.selectProvider("auto"))}
                className="mt-1"
              />
              <span className="text-ui-sm">
                <b>Automatic</b>
                <br />
                <span className="text-foreground-subtle">Your API key, then Local AI, then Ollama, then demo designs.</span>
              </span>
            </label>
            {state.options.map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border p-3",
                  state.selected === o.id && "border-brand",
                  o.available ? "cursor-pointer" : "opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  disabled={!o.available}
                  checked={state.selected === o.id}
                  onChange={() => void run(() => api.selectProvider(o.id))}
                  className="mt-1"
                />
                <span className="min-w-0 text-ui-sm">
                  <b>{o.label}</b>
                  {state.active === o.id
                    ? <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-ui-xs text-[var(--brand-fg)]">in use</span>
                    : null}
                  <br />
                  <span className="text-foreground-subtle">{o.detail}</span>
                  {o.note
                    ? (
                      <>
                        <br />
                        <span className="text-ui-xs text-foreground-subtle">{o.note}</span>
                      </>
                    )
                    : null}
                </span>
              </label>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-ui-xs font-semibold uppercase tracking-wide text-foreground-subtle">
              <Cpu className="size-3.5" aria-hidden />Local AI on this computer
            </h3>
            {status
              ? (
                <>
                  <p className={cn("text-ui-sm font-medium", TIER[status.assessment.tier].tone)}>{TIER[status.assessment.tier].label}</p>
                  <ul className="flex flex-col gap-1">
                    {status.assessment.checks.map((c) => (
                      <li key={c.text} className="flex items-start gap-2 text-ui-xs">
                        {c.level === "ok" ? <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden /> : (
                          <CircleAlert
                            className={cn("mt-0.5 size-3.5 shrink-0", c.level === "fail" ? "text-destructive" : "text-warn")}
                            aria-hidden
                          />
                        )}
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-ui-xs text-foreground-subtle">
                    Local models are slower and weaker than cloud models at design work, and nothing leaves this computer. Judge a result by
                    the Checks tab and by looking at it.
                  </p>

                  {!status.reachable
                    ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 text-ui-sm">
                        <p>
                          <b>Lemonade is not running</b> at <code className="font-mono text-ui-xs">{status.base}</code>.
                        </p>
                        <p className="text-foreground-subtle">
                          Lemonade is a free, open-source local AI server. Install it, start it, then come back here.
                        </p>
                        <a
                          className="inline-flex items-center gap-1.5 text-brand underline-offset-2 hover:underline"
                          href={status.installUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Get Lemonade <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                        <Button size="sm" variant="outline" className="self-start" onClick={() => void run(async () => undefined)}>
                          Check again
                        </Button>
                      </div>
                    )
                    : (
                      <ul className="flex flex-col gap-2">
                        {status.catalogue.map((m) => (
                          <li
                            key={m.name}
                            className={cn("flex items-center gap-3 rounded-lg border border-border p-3", m.recommended && "border-brand")}
                          >
                            <span className="min-w-0 flex-1 text-ui-sm">
                              <b>{m.label}</b>
                              {m.recommended ? <span className="ml-2 text-ui-xs text-brand">recommended</span> : null}
                              <br />
                              <span className="text-ui-xs text-foreground-subtle">
                                {m.licence}, download {gb(m.bytes)}, about {gb(m.runBytes)} of memory while running
                              </span>
                            </span>
                            {m.loaded ? <span className="text-ui-xs text-ok">loaded</span> : (
                              <Button
                                size="sm"
                                variant={m.recommended ? "primary" : "outline"}
                                disabled={!!working}
                                onClick={() => void run(() => api.localAi.setUp(m.name))}
                              >
                                {m.installed ? "Load" : "Download and load"}
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                  {live && live.stage !== "done"
                    ? (
                      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3" role="status">
                        <p className={cn("text-ui-sm", live.stage === "failed" && "text-destructive")}>
                          {working ? <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden /> : null}
                          {STAGE[live.stage]}
                          {live.stage === "downloading" && live.percent !== null ? ` ${Math.round(live.percent)}%` : ""}
                        </p>
                        {live.stage === "downloading"
                          ? (
                            <div className="h-1.5 overflow-hidden rounded-full bg-border">
                              <div className="h-full bg-brand transition-all" style={{ width: `${live.percent ?? 0}%` }} />
                            </div>
                          )
                          : null}
                        {live.error ? <p className="text-ui-xs text-destructive" role="alert">{live.error}</p> : null}
                        {working
                          ? (
                            <Button size="sm" variant="outline" className="self-start" onClick={() => void run(() => api.localAi.cancel())}>
                              Cancel (keeps what was downloaded)
                            </Button>
                          )
                          : null}
                      </div>
                    )
                    : null}
                  {status.loaded.length
                    ? (
                      <Button size="sm" variant="ghost" className="self-start" onClick={() => void run(() => api.localAi.unload())}>
                        Unload to free memory
                      </Button>
                    )
                    : null}
                </>
              )
              : <p className="text-ui-sm text-foreground-subtle">Checking this computer...</p>}
            {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Shown when only the demo fixtures are left: no key, no local server. */
export function NoAiBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-warn/10 px-4 py-2 text-ui-sm" role="status">
      <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden />
      <span>
        <b>No AI is configured.</b> You are seeing demo designs. Set up free Local AI, or add an API key in{" "}
        <code className="font-mono text-ui-xs">studio/.env</code>.
      </span>
      <Button size="sm" className="ml-auto" onClick={onOpen}>Set up Local AI</Button>
    </div>
  );
}
