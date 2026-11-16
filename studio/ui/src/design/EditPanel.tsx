// Edit by chat: the revision history of the selected design reads as a conversation. Each instruction becomes a
// new, non-destructive version (v1 -> v1-r1 -> v1-r2), so undo is just "go back one version".
import { chooseEditMode, type DesignFileInfo, type DesignScreen } from "../../../shared/design/index.ts";
import { ArrowUp, Check, Loader2, MousePointerClick, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, cn, Input } from "../kit.tsx";
import type { DesignListWithJobs } from "./designApi.ts";

const SUGGESTIONS = [
  "Make the header sticky",
  "Add an empty state to the list",
  "Make the primary action more prominent",
  "Tighten the spacing",
];

export function EditPanel({ screen, info, jobs, busy, prefill, onRefine, onSelectFile, onRelated, onPick, picking }: {
  screen: DesignScreen;
  info: DesignFileInfo;
  jobs: NonNullable<DesignListWithJobs["jobs"]>;
  busy: boolean;
  prefill?: { text: string; seq: number } | undefined;
  onRefine: (instruction: string, mode: "surgical" | "full") => void;
  onSelectFile: (file: string) => void;
  onRelated: (names: string[]) => void;
  onPick: () => void;
  picking: boolean;
}) {
  const [text, setText] = useState("");
  const [names, setNames] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    box.current?.focus();
  }, [prefill?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = screen.manifest.steps;
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [steps.length]);
  const mode = chooseEditMode(text);
  const patchErrors = screen.patchErrors ?? {};

  const send = () => {
    if (!text.trim() || busy) return;
    onRefine(text, mode);
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {steps.map((step) => {
          const job = jobs[`${screen.slug}/${step.id}`];
          const done = step.files.filter((f) => screen.files.some((x) => x.file === f));
          const failed = job ? Object.entries(job.errors) : [];
          const running = job?.state === "running" || (!job && done.length < step.files.length);
          return (
            <div key={step.id} className="flex flex-col gap-1.5">
              <p className="ml-auto max-w-[92%] rounded-xl rounded-br-sm bg-brand px-3 py-2 text-ui-sm text-[var(--brand-fg)]">
                {step.kind === "generate"
                  ? step.instruction.slice(0, 160)
                  : step.kind === "screens"
                  ? `Related screens: ${step.instruction}`
                  : step.instruction.slice(0, 200)}
              </p>
              <div className="flex max-w-[92%] flex-col gap-1.5 rounded-xl rounded-bl-sm border border-border bg-panel-2 px-3 py-2 text-ui-sm">
                {running
                  ? (
                    <span className="flex items-center gap-2 text-foreground-subtle">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />Working on{" "}
                      {step.files.length === 1 ? "one version" : `${step.files.length} versions`}...
                    </span>
                  )
                  : null}
                {done.length
                  ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Check className="size-3.5 text-ok" aria-hidden />
                      {done.map((file) => (
                        <button
                          key={file}
                          type="button"
                          onClick={() => onSelectFile(file)}
                          className={cn(
                            "rounded-md border border-border px-1.5 py-0.5 font-mono text-ui-xs hover:bg-surface-hover",
                            file === info.file && "border-brand text-brand",
                          )}
                        >
                          {file.replace(/\.html$/, "")}
                        </button>
                      ))}
                    </span>
                  )
                  : null}
                {failed.map(([file, message]) => (
                  <span key={file} className="flex items-start gap-1.5 text-destructive" role="alert">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {message}
                  </span>
                ))}
                {step.files.map((
                  f,
                ) => (patchErrors[f] ? <span key={f} className="text-destructive" role="alert">{patchErrors[f]}</span> : null))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => setText(s)}
              className="rounded-full border border-border px-2.5 py-1 text-ui-xs text-foreground-subtle hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <textarea
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            maxLength={4000}
            placeholder="Describe a change, or select an element first..."
            aria-label="Describe a change"
            className="ds-field pr-12"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-lg bg-brand text-[var(--brand-fg)] disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 text-ui-xs text-foreground-subtle">
          <button
            type="button"
            onClick={onPick}
            aria-pressed={picking}
            disabled={!info.ok || info.scripts}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1 hover:bg-surface-hover",
              picking && "bg-surface-hover text-foreground",
            )}
          >
            <MousePointerClick className="size-3.5" aria-hidden />Select element
          </button>
          <span className="truncate">
            {text.trim()
              ? (mode === "surgical" ? "Small edit: patches only what you name" : "Bigger change: rewrites this version")
              : "Enter to send"}
          </span>
        </div>
        <details className="text-ui-xs">
          <summary className="cursor-pointer text-foreground-subtle">Related screens</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Input value={names} onChange={(e) => setNames(e.target.value)} placeholder="detail, settings" aria-label="Related screens" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !names.trim()}
                onClick={() => {
                  onRelated(names.split(",").map((n) => n.trim()).filter(Boolean));
                  setNames("");
                }}
              >
                Generate in the same system
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
