// Daedalus Studio: the shell. State lives here; the panels are small and take what they need as props.
import type { DesignScreen } from "../../shared/design/index.ts";
import { lintDesign } from "../../shared/design/designLint.ts";
import { TARGET_FRAMES } from "../../shared/design/designPrompts.ts";
import { tokenMap, tokensFromDesignMd } from "../../shared/design/tokens.ts";
import { Layers, Minus, Moon, Plus, Redo2, Sparkles, Sun, Undo2, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, cn } from "./kit.tsx";
import { type BriefInput, DesignBriefForm } from "./design/DesignBriefForm.tsx";
import type { BridgeMark } from "./design/DesignBridgeFrame.tsx";
import { ChecksPanel } from "./design/ChecksPanel.tsx";
import { DesignCanvas } from "./design/DesignCanvas.tsx";
import { DesignDirections } from "./design/DesignDirections.tsx";
import { EditPanel } from "./design/EditPanel.tsx";
import { ExportPanel } from "./design/ExportPanel.tsx";
import { FlowBoard } from "./design/FlowBoard.tsx";
import { PlanDialog } from "./design/PlanDialog.tsx";
import { SystemView } from "./design/SystemView.tsx";
import { designApi as api, type DesignListWithJobs, type PlanView, type StudioConfig } from "./design/designApi.ts";
import { type BridgeMessage, selectorOfInstruction } from "./design/designBridge.ts";
import { clearLiveWrite, publishLiveWrite, wasStreamed } from "./design/designStreamStore.ts";

type View = "variants" | "flow" | "directions" | "system";
type Device = "auto" | "phone" | "tablet" | "desktop";
type Panel = "edit" | "checks" | "export";
type Theme = "light" | "dark";

const REFRESH_MS = 1500;
const ZOOMS = [0.25, 0.35, 0.5, 0.65, 0.8, 1];
const FRAMES = {
  phone: { width: 390, height: 844, radius: 34 },
  tablet: { width: 834, height: 1112, radius: 22 },
  desktop: { width: 1280, height: 800, radius: 10 },
};
const message = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("studio-theme", next);
      } catch {
        // Private mode: the choice just does not persist.
      }
      return next;
    });
  return [theme, toggle];
}

function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--brand)" />
        <path
          d="M8.5 6.5h3a5.5 5.5 0 0 1 0 11h-3z"
          fill="none"
          stroke="var(--brand-fg)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Daedalus Studio
    </span>
  );
}

export function Studio() {
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [list, setList] = useState<DesignListWithJobs | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [view, setView] = useState<View>("variants");
  const [device, setDevice] = useState<Device>("auto");
  const [panel, setPanel] = useState<Panel>("edit");
  const [creating, setCreating] = useState(false);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 700 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; seq: number } | undefined>();
  const [doneMarks, setDoneMarks] = useState<Record<string, BridgeMark>>({});
  const [html, setHtml] = useState<Record<string, { at: string; html: string }>>({});
  const [redoTo, setRedoTo] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [plan, setPlan] = useState<{ plan: PlanView; title: string; resolve: (files: string[] | null) => void } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [theme, toggleTheme] = useTheme();

  const observer = useRef<ResizeObserver | null>(null);
  const canvasRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new ResizeObserver(([e]) => setCanvasSize({ w: e?.contentRect.width ?? 800, h: e?.contentRect.height ?? 700 }));
    observer.current.observe(node);
  }, []);

  // --- data ---------------------------------------------------------------------------------------------------
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setList(await api.list());
    } catch (reason) {
      setError(message(reason));
    } finally {
      inFlight.current = false;
    }
  }, []);
  const reloadConfig = useCallback(() => api.config().then(setConfig, (r) => setError(message(r))), []);

  useEffect(() => {
    void reloadConfig();
    void refresh();
    const timer = setInterval(() => document.visibilityState !== "hidden" && void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh, reloadConfig]);

  // Live writes: partial HTML of the file the model is writing right now builds itself on the artboard.
  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as { type: string; key?: string; html?: string; done?: boolean };
      if (data.type === "write" && data.key && typeof data.html === "string" && data.html !== "") {
        publishLiveWrite(data.key, data.html, data.done === true);
        if (data.done) setTimeout(() => clearLiveWrite(data.key!), 15_000);
      }
      if (data.type === "job") void refresh();
    };
    return () => source.close();
  }, [refresh]);

  const screen: DesignScreen | undefined = list?.screens.find((s) => s.slug === slug) ?? list?.screens[0];
  const selectedFile = file && screen?.files.some((f) => f.file === file) ? file : (screen?.files[0]?.file ?? null);
  const info = screen?.files.find((f) => f.file === selectedFile);

  useEffect(() => {
    if (pendingFile && screen?.files.some((f) => f.file === pendingFile && f.ok)) {
      setFile(pendingFile);
      setPendingFile(null);
    }
  }, [pendingFile, screen]);

  // Files that show up without streaming (surgical patches) flash the changed element instead of replaying.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!list) return;
    const keys = list.screens.flatMap((s) => s.files.filter((f) => f.ok).map((f) => `${s.slug}/${f.file}`));
    if (seen.current === null) {
      seen.current = new Set(keys);
      return;
    }
    const added = keys.filter((k) => !seen.current!.has(k));
    const surgical = new Set(
      list.screens.flatMap((s) =>
        s.manifest.steps.filter((st) => st.mode === "surgical").flatMap((st) => st.files.map((f) => `${s.slug}/${f}`))
      ),
    );
    const patched = added.filter((k) => surgical.has(k));
    if (patched.length) {
      setDoneMarks((prev) => {
        const next = { ...prev };
        for (const k of patched) {
          const [slugOf, fileOf] = k.split("/") as [string, string];
          const st = list.screens.find((x) => x.slug === slugOf)?.manifest.steps.find((s) => s.files.includes(fileOf));
          const selector = st ? selectorOfInstruction(st.instruction) : null;
          if (selector) next[k] = { selector, kind: "done", seq: Date.now() };
        }
        return next;
      });
    }
    for (const k of added) seen.current.add(k);
    const replay = added.filter((k) => !wasStreamed(k) && !surgical.has(k));
    if (replay.length) setFresh((prev) => new Set([...prev, ...replay]));
  }, [list]);

  useEffect(() => {
    if (!screen) return;
    let live = true;
    for (const f of screen.files.filter((item) => item.ok)) {
      const key = `${screen.slug}/${f.file}`;
      if (html[key]?.at === f.modifiedAt) continue;
      api.read(screen.slug, f.file).then(
        (text) => live && setHtml((prev) => ({ ...prev, [key]: { at: f.modifiedAt, html: text } })),
        () => undefined,
      );
    }
    return () => {
      live = false;
    };
  }, [screen, html]);

  const htmlByFile = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of screen?.files ?? []) {
      const hit = html[`${screen!.slug}/${f.file}`];
      if (hit && f.ok) out[f.file] = hit.html;
    }
    return out;
  }, [html, screen]);

  const projectTokens = useMemo(() => (config?.tokens ? tokenMap(config.tokens) : undefined), [config]);
  const warnings = useMemo(() => {
    const out: Record<string, ReturnType<typeof lintDesign>> = {};
    if (!screen) return out;
    for (const [name, source] of Object.entries(htmlByFile)) {
      const parent = screen.manifest.steps.find((s) => s.files.includes(name))?.parent;
      out[name] = lintDesign(source, {
        brief: screen.manifest.brief,
        target: screen.manifest.target,
        ...(projectTokens ? { projectTokens } : {}),
        ...(parent && htmlByFile[parent] ? { parent: htmlByFile[parent] } : {}),
      });
    }
    return out;
  }, [htmlByFile, screen, projectTokens]);

  const marks = useMemo(() => {
    const out: Record<string, BridgeMark> = {};
    if (!screen) return out;
    for (const st of screen.manifest.steps) {
      const selector = st.mode === "surgical" && st.parent ? selectorOfInstruction(st.instruction) : null;
      if (selector && st.parent && st.files.some((f) => !screen.files.some((x) => x.file === f))) {
        out[st.parent] = { selector, kind: "working", seq: 0 };
      }
    }
    for (const [k, m] of Object.entries(doneMarks)) if (screen && k.startsWith(`${screen.slug}/`)) out[k.slice(screen.slug.length + 1)] = m;
    return out;
  }, [screen, doneMarks]);

  // --- frame size and zoom ------------------------------------------------------------------------------------
  const frame = device === "auto" ? TARGET_FRAMES[screen?.manifest.target ?? "web-desktop"] : FRAMES[device];
  const fit = Math.min(1, Math.max(0.25, Math.min((canvasSize.w - 96) / (frame.width * 1.3), (canvasSize.h - 140) / frame.height)));
  const zoom = manualZoom ?? fit;
  const stepZoom = (dir: 1 | -1) =>
    setManualZoom(dir === 1 ? (ZOOMS.find((z) => z > zoom + 0.01) ?? 1) : ([...ZOOMS].reverse().find((z) => z < zoom - 0.01) ?? 0.25));

  // --- history: every edit is a new version, so undo is "go to the parent" ---------------------------------------
  const parentOf = (f: string) => screen?.manifest.steps.find((s) => s.files.includes(f))?.parent ?? null;
  const parent = selectedFile ? parentOf(selectedFile) : null;
  const undo = () => {
    if (!selectedFile || !parent) return;
    setRedoTo(selectedFile);
    setFile(parent);
  };
  const redo = () => {
    if (!redoTo || !screen?.files.some((f) => f.file === redoTo)) return;
    setFile(redoTo);
    setRedoTo(null);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // --- actions ----------------------------------------------------------------------------------------------
  const guard = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refresh();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };

  const submit = (input: BriefInput) =>
    guard(async () => {
      setCreating(false);
      setView("variants");
      if (input.engine === "stitch") {
        setSlug((await api.stitchGenerate({ name: input.name, brief: input.brief, target: input.target, count: input.count })).slug);
        return;
      }
      const begun = await api.begin({
        step: "generate",
        name: input.name,
        brief: input.brief,
        target: input.target,
        count: input.count,
        ...(input.reference ? { reference: input.reference } : {}),
      });
      setSlug(begun.slug);
      setFile(null);
      setManualZoom(null);
    });

  const step = (kind: "refine" | "fix" | "screens", extra: { instruction?: string; mode?: "surgical" | "full"; names?: string[] }) =>
    guard(async () => {
      if (!screen || !selectedFile) return;
      const begun = await api.begin({ step: kind, slug: screen.slug, parent: selectedFile, ...extra });
      if (kind !== "screens") setPendingFile(begun.step.files[0]!);
      setRedoTo(null);
    });

  const onBridge = (f: string, m: BridgeMessage) => {
    if (m.t !== "pick") return;
    setFile(f);
    setPick(false);
    setPanel("edit");
    setPrefill({ text: `Change [${m.selector}] (${m.tag}${m.label ? ` "${m.label}"` : ""}): `, seq: Date.now() });
  };

  // --- plan review (the only way files get written) ------------------------------------------------------------
  const openPlan = (p: PlanView, title: string) =>
    new Promise<string[] | null>((resolve) => {
      setPlanError(null);
      setPlan({ plan: p, title, resolve });
    });
  const planFiles = async (files: { path: string; content: string }[], title: string) => {
    try {
      await openPlan(await api.plan(files), title);
    } catch (reason) {
      setError(message(reason));
    }
  };
  const confirmPlan = async () => {
    if (!plan) return;
    setPlanBusy(true);
    try {
      const { written } = await api.apply(plan.plan.id);
      plan.resolve(written);
      setPlan(null);
      setAppliedCount((n) => n + 1);
      void reloadConfig();
      void refresh();
    } catch (reason) {
      setPlanError(message(reason));
    } finally {
      setPlanBusy(false);
    }
  };
  const cancelPlan = () => {
    plan?.resolve(null);
    setPlan(null);
  };
  const applyDirection = async (id: string) => {
    try {
      const md = await api.directions.readMd(id);
      if (!md) throw new Error("This direction has no DESIGN.md yet.");
      const tokens = tokensFromDesignMd(md, config?.tokens ?? null);
      await planFiles([
        { path: "DESIGN.md", content: md },
        ...(tokens ? [{ path: "design/tokens.json", content: `${JSON.stringify(tokens, null, 2)}\n` }] : []),
      ], "Apply the chosen direction to the project");
    } catch (reason) {
      setError(message(reason));
    }
  };

  const jobs = list?.jobs ?? {};
  const running = Object.values(jobs).some((j) => j.state === "running");
  const showForm = creating || (list !== null && list.screens.length === 0);
  const hasScreen = screen && info;

  if (!config || !list) return <div className="grid h-full place-items-center text-foreground-subtle">{error ?? "Loading studio..."}</div>;

  return (
    <div className="grid h-full grid-rows-[52px_minmax(0,1fr)]">
      <header className="flex items-center gap-4 border-b border-border bg-panel px-4">
        <Logo />
        <span className="hidden rounded-md border border-border px-2 py-0.5 text-ui-xs text-foreground-subtle sm:inline">
          {config.name}
        </span>
        <div className="seg mx-auto" role="group" aria-label="View">
          {([["variants", "Variants"], ["flow", "Flow"], ["directions", "Directions"], ["system", "System"]] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Device">
          {(["auto", "phone", "tablet", "desktop"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => {
                setDevice(d);
                setManualZoom(null);
              }}
            >
              {d === "auto" ? "Auto" : d[0]!.toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button variant="ghost" size="sm" aria-label="Zoom out" disabled={zoom <= 0.25} onClick={() => stepZoom(-1)}>
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-ui-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" aria-label="Zoom in" disabled={zoom >= 1} onClick={() => stepZoom(1)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label="Undo" title="Undo (previous version)" disabled={!parent} onClick={undo}>
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Redo" title="Redo" disabled={!redoTo} onClick={redo}>
            <Redo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-ui-xs"
          title={config.provider.note ?? undefined}
        >
          <span className={cn("size-1.5 rounded-full", running ? "animate-pulse bg-warn" : "bg-ok")} aria-hidden />
          {config.provider.label}
          {config.provider.id === "ollama" ? <span className="text-warn">lower quality</span> : null}
        </span>
      </header>

      <div
        className={cn(
          "grid min-h-0",
          view === "variants" && hasScreen ? "grid-cols-[272px_minmax(0,1fr)_344px]" : "grid-cols-[272px_minmax(0,1fr)]",
        )}
      >
        <aside className="flex min-h-0 flex-col gap-3 overflow-auto border-r border-border bg-panel p-3" aria-label="Screens">
          <Button
            onClick={() => {
              setCreating(true);
              setView("variants");
            }}
          >
            <Sparkles className="size-4" aria-hidden />New screen
          </Button>
          <ul className="flex flex-col gap-1">
            {list.screens.map((s) => {
              const active = s.slug === screen?.slug;
              const job = Object.entries(jobs).find(([k]) => k.startsWith(`${s.slug}/`) && jobs[k]?.state === "running");
              return (
                <li key={s.slug}>
                  <button
                    type="button"
                    aria-current={active}
                    onClick={() => {
                      setSlug(s.slug);
                      setFile(null);
                      setCreating(false);
                      setView((v) => (v === "variants" || v === "flow" ? v : "variants"));
                      setManualZoom(null);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-hover",
                      active && "bg-surface-hover",
                    )}
                  >
                    <Layers className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui-sm font-medium">{s.slug}</span>
                      <span className="block text-ui-xs text-foreground-subtle">
                        {s.files.length} {s.files.length === 1 ? "version" : "versions"}
                        {job ? " - working" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {error ? <p className="rounded-lg border border-destructive/40 p-2 text-ui-xs text-destructive" role="alert">{error}</p> : null}
          <p className="mt-auto flex items-center gap-1.5 text-ui-xs text-foreground-subtle">
            <Workflow className="size-3.5" aria-hidden />Files are written only after you review a diff.
          </p>
        </aside>

        <main ref={canvasRef} className="flex min-h-0 min-w-0 flex-col bg-background-alt">
          {view === "system"
            ? (
              <div className="min-h-0 flex-1 overflow-auto">
                <SystemView
                  config={config}
                  onPlan={(files, title) => void planFiles(files, title)}
                  onDirections={() => setView("directions")}
                />
              </div>
            )
            : view === "directions"
            ? (
              <div className="min-h-0 flex-1 overflow-auto p-6">
                <DesignDirections onApply={(id) => void applyDirection(id)} />
              </div>
            )
            : view === "flow"
            ? (
              <FlowBoard
                screens={list.screens}
                frame={frame}
                theme={theme}
                onOpen={(s) => {
                  setSlug(s);
                  setFile(null);
                  setView("variants");
                }}
              />
            )
            : showForm
            ? (
              <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-8">
                <div className="w-full max-w-xl rounded-2xl border border-border bg-panel p-8 shadow-[var(--shadow)]">
                  <h1 className="text-2xl font-semibold tracking-tight">Start from a brief</h1>
                  <p className="mb-6 mt-1 text-ui-sm text-foreground-subtle">
                    Describe a screen or a flow in plain words. You get several different versions built from your DESIGN.md and tokens,
                    ready to refine.
                  </p>
                  <DesignBriefForm
                    hasDesignMd={config.hasDesignMd}
                    stitchConfigured={config.stitch}
                    busy={busy}
                    error={error}
                    onSubmit={(input) => void submit(input)}
                  />
                  {list.screens.length > 0
                    ? <Button variant="ghost" size="sm" className="mt-3" onClick={() => setCreating(false)}>Back to screens</Button>
                    : null}
                </div>
              </div>
            )
            : screen
            ? (
              <>
                <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2">
                  <span className="truncate text-ui-sm font-medium">{screen.manifest.brief.slice(0, 90)}</span>
                  <span className="ml-auto text-ui-xs text-foreground-subtle">{selectedFile?.replace(/\.html$/, "")}</span>
                </div>
                <div className="min-h-0 flex-1">
                  <DesignCanvas
                    screen={screen}
                    pick={pick}
                    marks={marks}
                    theme={theme}
                    frame={frame}
                    onBridge={onBridge}
                    fresh={fresh}
                    htmlByFile={htmlByFile}
                    selected={selectedFile}
                    zoom={zoom}
                    warnings={Object.fromEntries(Object.entries(warnings).map(([k, v]) => [k, v.length]))}
                    onSelect={setFile}
                  />
                </div>
              </>
            )
            : <p className="m-auto text-ui-sm text-foreground-subtle">Pick or create a screen.</p>}
        </main>

        {view === "variants" && hasScreen && !showForm
          ? (
            <aside className="flex min-h-0 flex-col border-l border-border bg-panel" aria-label="Inspector">
              <div className="border-b border-border p-2">
                <div className="seg w-full [&>button]:flex-1" role="tablist" aria-label="Inspector">
                  {([["edit", "Edit"], [
                    "checks",
                    `Checks${warnings[selectedFile!]?.length ? ` (${warnings[selectedFile!]!.length})` : ""}`,
                  ], ["export", "Export"]] as const).map(([p, label]) => (
                    <button
                      key={p}
                      type="button"
                      role="tab"
                      aria-selected={panel === p}
                      aria-pressed={panel === p}
                      onClick={() => setPanel(p)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {panel === "edit"
                  ? (
                    <EditPanel
                      screen={screen}
                      info={info}
                      jobs={jobs}
                      busy={busy}
                      prefill={prefill}
                      picking={pick}
                      onPick={() => setPick((p) => !p)}
                      onSelectFile={setFile}
                      onRefine={(instruction, mode) => void step("refine", { instruction, mode })}
                      onRelated={(names) => void step("screens", { names })}
                    />
                  )
                  : panel === "checks"
                  ? (
                    <ChecksPanel
                      warnings={warnings[info.file] ?? []}
                      busy={busy}
                      onFix={(instruction) => void step("fix", { instruction, mode: "full" })}
                    />
                  )
                  : <ExportPanel config={config} slug={screen.slug} file={info.file} onPlan={openPlan} applied={appliedCount} />}
              </div>
            </aside>
          )
          : null}
      </div>

      {plan
        ? (
          <PlanDialog
            plan={plan.plan}
            title={plan.title}
            busy={planBusy}
            error={planError}
            onWrite={() => void confirmPlan()}
            onCancel={cancelPlan}
          />
        )
        : null}
    </div>
  );
}
