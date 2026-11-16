import {
  DIRECTION_PLATFORMS,
  type DirectionPlan,
  type DirectionPlatform,
  type DirectionsInput,
  type DirectionsView,
} from "../../../shared/design/index.ts";
import { Check, Lock, LockOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../kit.tsx";
import { Button } from "../kit.tsx";
import { Input } from "../kit.tsx";
import { useProjectsT } from "../i18n.ts";
import { DirectionFrame } from "./DirectionFrame.tsx";
import { DirectionsForm } from "./DirectionsForm.tsx";
import { designApi as api } from "./designApi.ts";
import { lintDesign } from "../../../shared/design/designLint.ts";
import { LINT_RULES } from "../../../shared/design/designLintStructure.ts";

const REFRESH_MS = 1500;
const message = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));
type Choice = DirectionPlatform | "all";

/** Share of the checks a page passes, 0..1. Directions are compared on the average over their screens. */
export function directionScore(htmls: readonly string[], brief: string): number | null {
  if (htmls.length === 0) return null;
  const total = LINT_RULES.length;
  const passed = htmls.map((html) => total - new Set(lintDesign(html, { brief }).map((w) => w.id)).size);
  return passed.reduce((a, b) => a + b, 0) / (passed.length * total);
}

/**
 * The comparison board: directions are rows, key screens are columns, the device toggle picks which
 * frames each cell shows. Picking a direction locks it (design/selected.json) for engineering.
 */
export function DesignDirections({ onApply }: {
  /** Opens the diff for writing the chosen direction's DESIGN.md and tokens into the project. */
  onApply: (directionId: string) => void;
}) {
  const t = useProjectsT();
  const [view, setView] = useState<DirectionsView | null>(null);
  const [choice, setChoice] = useState<Choice>("all");
  const [html, setHtml] = useState<Record<string, { at: string; html: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [replacing, setReplacing] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setView(await api.directions.list());
    } catch (reason) {
      setError(message(reason));
    } finally {
      inFlight.current = false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Read each clean page once per change; main sanitises it again on every read.
  useEffect(() => {
    if (!view?.set) return;
    let live = true;
    for (const direction of view.set.directions) {
      for (const status of (view.files[direction.id] ?? []).filter((s) => s.ok)) {
        const key = `${direction.id}/${status.screen}`;
        if (html[key]?.at === status.modifiedAt) continue;
        api.directions.read(direction.id, status.screen).then(
          (text) => {
            if (live) setHtml((prev) => ({ ...prev, [key]: { at: status.modifiedAt, html: text } }));
          },
          () => undefined,
        );
      }
    }
    return () => {
      live = false;
    };
  }, [view, html]);

  const scores = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const direction of view?.set?.directions ?? []) {
      const pages = direction.screens.map((s) => html[`${direction.id}/${s.id}`]?.html).filter((h): h is string =>
        h !== undefined
      );
      out[direction.id] = directionScore(pages, view?.set?.brief ?? "");
    }
    return out;
  }, [html, view]);

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

  const generate = (input: DirectionsInput) =>
    guard(async () => {
      await api.directions.generate(input);
      setReplacing(false);
      setHtml({});
    });

  const pick = (direction: DirectionPlan) =>
    guard(async () => void (await api.directions.lock(direction.id, notes[direction.id] ?? "")));
  const complete = (direction: DirectionPlan) =>
    view?.designMd[direction.id] === true &&
    direction.screens.every((s) => (view?.files[direction.id] ?? []).some((f) => f.screen === s.id && f.ok));

  if (!view) return <p className="py-6 text-ui-base text-foreground-subtle">{t("loading")}</p>;
  if (!view.set || replacing) {
    return (
      <DirectionsForm
        busy={busy}
        error={error}
        onSubmit={(input) => void generate(input)}
      />
    );
  }

  const { set, selection } = view;
  const platforms: DirectionPlatform[] = choice === "all" ? [...DIRECTION_PLATFORMS] : [choice];
  const columns = set.directions[0]!.screens;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={t("design.device")} className="flex items-center gap-1">
          {(["web", "ios", "android", "all"] as const).map((name) => (
            <Button
              key={name}
              size="sm"
              variant={name === choice ? "secondary" : "ghost"}
              aria-pressed={name === choice}
              onClick={() => setChoice(name)}
            >
              {t(`design.platform.${name}`)}
            </Button>
          ))}
        </div>
        <span className="text-ui-xs text-foreground-subtle">{t(`design.stack.${set.stack}`)}</span>
        <Button
          className="ml-auto"
          size="sm"
          variant="outline"
          disabled={busy || selection !== null}
          onClick={() => setReplacing(true)}
        >
          {t("design.directionsNew")}
        </Button>
      </div>
      {selection
        ? (
          <div
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-hover px-4 py-3"
            role="status"
          >
            <Lock className="size-4" aria-hidden />
            <span className="text-ui-sm font-medium">{t("design.locked", { name: selection.name })}</span>
            <span className="text-ui-xs text-foreground-subtle">design/selected.json</span>
            <Button
              className="ml-auto"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => onApply(selection.directionId)}
            >
              {t("design.applyDirection")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void guard(() => api.directions.unlock())}>
              <LockOpen className="size-4" aria-hidden />
              {t("design.unlock")}
            </Button>
          </div>
        )
        : null}
      {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
      <div className="overflow-auto rounded-md border border-border" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="grid min-w-max" style={{ gridTemplateColumns: `220px repeat(${columns.length}, max-content)` }}>
          <div className="sticky left-0 top-0 z-20 border-b border-r border-border bg-background px-4 py-2 text-ui-xs font-semibold uppercase tracking-wide text-foreground-subtle">
            {t("design.directionsRows")}
          </div>
          {columns.map((c) => (
            <div
              key={c.id}
              className="sticky top-0 z-10 border-b border-border bg-background px-3 py-2 text-ui-xs font-semibold uppercase tracking-wide text-foreground-subtle"
            >
              {c.title}
            </div>
          ))}
          {set.directions.map((direction) => {
            const score = scores[direction.id] ?? null;
            const missing = direction.screens.filter((s) =>
              !(view.files[direction.id] ?? []).some((f) => f.screen === s.id)
            ).length;
            const chosen = selection?.directionId === direction.id;
            return (
              <div key={direction.id} className="contents">
                <div
                  className={cn(
                    "sticky left-0 z-10 flex flex-col gap-2 border-b border-r border-border bg-background p-4",
                    chosen && "bg-surface-hover",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full border border-border"
                      style={{ background: direction.seed }}
                      aria-hidden
                    />
                    <span className="text-ui-base font-semibold">{direction.name}</span>
                    {chosen ? <Check className="size-4 text-emerald-600" aria-label={t("design.chosen")} /> : null}
                  </div>
                  <p className="text-ui-xs text-foreground-subtle">
                    {score === null
                      ? t("design.directionsWaiting", { count: missing })
                      : t("design.directionsScore", { percent: Math.round(score * 100) })}
                    {score !== null && missing > 0 ? ` · ${t("design.directionsWaiting", { count: missing })}` : ""}
                  </p>
                  <Input
                    value={notes[direction.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [direction.id]: e.target.value }))}
                    placeholder={t("design.tweakNotes")}
                    aria-label={t("design.tweakNotes")}
                    maxLength={4000}
                    disabled={selection !== null}
                  />
                  <Button
                    size="sm"
                    variant={chosen ? "secondary" : "outline"}
                    disabled={busy || selection !== null || !complete(direction)}
                    onClick={() => void pick(direction)}
                  >
                    {t("design.pick.direction")}
                  </Button>
                </div>
                {direction.screens.map((screen) => {
                  const status = (view.files[direction.id] ?? []).find((f) => f.screen === screen.id);
                  const page = status?.ok ? html[`${direction.id}/${screen.id}`]?.html : undefined;
                  return (
                    <div key={screen.id} className="flex items-start gap-3 border-b border-border p-3">
                      {platforms.map((platform) => (
                        <DirectionFrame
                          key={platform}
                          html={page}
                          platform={platform}
                          title={`${direction.name} ${screen.title} ${platform}`}
                          status={status && !status.ok ? t("design.blocked") : t("design.waiting")}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
