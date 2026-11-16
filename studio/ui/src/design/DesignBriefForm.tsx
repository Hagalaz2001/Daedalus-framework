import { DESIGN_TARGETS, type DesignEngine, type DesignTarget } from "../../../shared/design/index.ts";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../kit.tsx";
import { Button } from "../kit.tsx";
import { Input } from "../kit.tsx";
import { Textarea } from "../kit.tsx";
import { useProjectsT } from "../i18n.ts";

export interface BriefInput {
  name: string;
  brief: string;
  target: DesignTarget;
  count: number;
  engine: DesignEngine;
  reference?: { mime: string; bytes: Uint8Array };
}

const MAX_REFERENCE = 5 * 1024 * 1024;

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-px overflow-hidden rounded-md border border-border bg-border"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2 py-1.5 text-ui-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            option.value === value ? "bg-foreground text-background" : "bg-background text-foreground-subtle hover:bg-surface-hover",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DesignBriefForm({ hasDesignMd, stitchConfigured, busy, error, onSubmit }: {
  hasDesignMd: boolean;
  stitchConfigured: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (input: BriefInput) => void;
}) {
  const t = useProjectsT();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [target, setTarget] = useState<DesignTarget>("web-desktop");
  const [count, setCount] = useState(3);
  const [engine, setEngine] = useState<DesignEngine>("model");
  const [reference, setReference] = useState<{ name: string; mime: string; bytes: Uint8Array } | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_REFERENCE) return setRefError(t("design.referenceBad"));
    setRefError(null);
    setReference({ name: file.name, mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (brief.trim()) onSubmit({ name, brief, target, count, engine, ...(reference && engine === "model" ? { reference } : {}) });
      }}
    >
      <label className="flex flex-col gap-1.5 text-ui-sm font-medium">
        {t("design.name")}
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("design.namePlaceholder")} maxLength={40} />
      </label>
      <label className="flex flex-col gap-1.5 text-ui-sm font-medium">
        {t("design.brief")}
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          maxLength={8000}
          placeholder={t("design.briefPlaceholder")}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-ui-sm font-medium">{t("design.target")}</span>
        <Segmented
          label={t("design.target")}
          value={target}
          onChange={setTarget}
          options={DESIGN_TARGETS.map((value) => ({ value, label: t(`design.targetName.${value}`) }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-ui-sm font-medium">{t("design.engine")}</span>
        <Segmented
          label={t("design.engine")}
          value={engine}
          onChange={setEngine}
          options={[
            { value: "model", label: t("design.engineModel") },
            { value: "stitch", label: t("design.engineStitch"), disabled: !stitchConfigured },
          ]}
        />
        {stitchConfigured ? null : <p className="text-ui-xs text-foreground-subtle">{t("design.stitchHint")}</p>}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-ui-sm font-medium">
          {t("design.count")}
          <Input
            type="number"
            min={1}
            max={5}
            value={count}
            onChange={(e) => setCount(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16"
          />
        </label>
        <span className="text-ui-xs text-foreground-subtle">{hasDesignMd ? t("design.designMdFound") : t("design.designMdMissing")}</span>
      </div>
      {engine === "model"
        ? (
          <div className="flex flex-col gap-1.5">
            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            {reference
              ? (
                <span className="flex items-center gap-2 text-ui-sm">
                  <ImagePlus className="size-4" aria-hidden />
                  <span className="truncate">{reference.name}</span>
                  <button type="button" aria-label={t("design.referenceRemove")} onClick={() => setReference(null)}>
                    <X className="size-3.5" />
                  </button>
                </span>
              )
              : (
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => picker.current?.click()}>
                  <ImagePlus className="size-4" aria-hidden />
                  {t("design.reference")}
                </Button>
              )}
            {refError ? <p className="text-ui-xs text-destructive" role="alert">{refError}</p> : null}
          </div>
        )
        : null}
      {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || !brief.trim()}>
        {busy ? t("design.generating") : t(`design.generate.${count === 1 ? "one" : "other"}`, { count })}
      </Button>
    </form>
  );
}
