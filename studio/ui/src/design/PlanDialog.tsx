// The review step before anything is written: every file of a plan with its diff. Nothing reaches disk until Write.
import { FilePlus2, FileText, Image } from "lucide-react";
import { useState } from "react";
import { Button, cn } from "../kit.tsx";
import type { PlanView } from "./designApi.ts";

const MAX_LINES = 400;

export function PlanDialog({ plan, title, busy, error, onWrite, onCancel }: {
  plan: PlanView;
  title: string;
  busy: boolean;
  error: string | null;
  onWrite: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(plan.files[0]?.path);
  const file = plan.files.find((f) => f.path === open) ?? plan.files[0]!;
  const changed = plan.files.filter((f) => f.status !== "unchanged");
  const lines = file.diff;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-[var(--shadow)]">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <h2 className="text-ui-base font-semibold">{title}</h2>
          <span className="text-ui-xs text-foreground-subtle">
            {changed.length} {changed.length === 1 ? "file" : "files"} to write. Nothing is written until you confirm.
          </span>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)]">
          <ul className="overflow-auto border-r border-border p-2">
            {plan.files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setOpen(f.path)}
                  aria-current={f.path === file.path}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-ui-xs hover:bg-surface-hover",
                    f.path === file.path && "bg-surface-hover",
                  )}
                >
                  {f.binary
                    ? <Image className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    : f.status === "new"
                    ? <FilePlus2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden />
                    : <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                  <span className="min-w-0 flex-1 break-all font-mono">{f.path}</span>
                  <span
                    className={cn("shrink-0 uppercase tracking-wide", f.status === "unchanged" ? "text-foreground-subtle" : "text-brand")}
                  >
                    {f.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="min-w-0 overflow-auto bg-panel-2">
            {file.binary
              ? (
                <p className="p-6 text-ui-sm text-foreground-subtle">
                  Image file, {Math.round(file.bytes / 1024)} KB. Shown after it is written.
                </p>
              )
              : file.status === "unchanged"
              ? <p className="p-6 text-ui-sm text-foreground-subtle">No changes: this file is already identical.</p>
              : (
                <pre className="m-0 min-w-max p-0 font-mono text-[12px] leading-[18px]">
                {lines.slice(0, MAX_LINES).map((l, i) => (
                  <div key={i} className={cn("flex px-3", l.kind === "add" && "bg-ok/10", l.kind === "del" && "bg-destructive/10")}>
                    <span className={cn("w-5 shrink-0 select-none", l.kind === "add" ? "text-ok" : l.kind === "del" ? "text-destructive" : "text-foreground-subtle")}>{l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}</span>
                    <span className="whitespace-pre">{l.text}</span>
                  </div>
                ))}
                {lines.length > MAX_LINES ? <div className="px-3 py-2 text-foreground-subtle">... {lines.length - MAX_LINES} more lines</div> : null}
                </pre>
              )}
          </div>
        </div>
        <footer className="flex items-center gap-3 border-t border-border px-5 py-3">
          {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button onClick={onWrite} disabled={busy || changed.length === 0}>
              {busy ? "Writing..." : `Write ${changed.length} ${changed.length === 1 ? "file" : "files"}`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
