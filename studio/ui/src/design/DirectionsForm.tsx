import {
  DEFAULT_DIRECTION_SCREENS,
  DIRECTION_STACKS,
  type DirectionsInput,
  type DirectionStack,
} from "../../../shared/design/index.ts";
import { useState } from "react";
import { cn } from "../kit.tsx";
import { Button } from "../kit.tsx";
import { Input } from "../kit.tsx";
import { Textarea } from "../kit.tsx";
import { useProjectsT } from "../i18n.ts";

/** Brief, stack, how many directions and which key screens: everything the board needs to start. */
export function DirectionsForm(
  { busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (input: DirectionsInput) => void },
) {
  const t = useProjectsT();
  const [brief, setBrief] = useState("");
  const [stack, setStack] = useState<DirectionStack>("react-flutter");
  const [count, setCount] = useState(3);
  const [screens, setScreens] = useState("");
  const titles = (screens.trim() ? screens.split(",") : DEFAULT_DIRECTION_SCREENS).map((s) => s.trim()).filter(Boolean);
  return (
    <form
      className="mx-auto flex w-full max-w-xl flex-col gap-4 py-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (brief.trim()) onSubmit({ brief, stack, count, screens: titles });
      }}
    >
      <div>
        <h2 className="text-ui-lg font-semibold">{t("design.directionsTitle")}</h2>
        <p className="mt-1 text-ui-sm text-foreground-subtle">{t("design.directionsIntro")}</p>
      </div>
      <label className="flex flex-col gap-1.5 text-ui-sm font-medium">
        {t("design.brief")}
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          maxLength={8000}
          placeholder={t("design.directionsBriefPlaceholder")}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-ui-sm font-medium">{t("design.stack")}</span>
        <div
          role="group"
          aria-label={t("design.stack")}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border"
        >
          {DIRECTION_STACKS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === stack}
              onClick={() => setStack(value)}
              className={cn(
                "px-3 py-2 text-ui-sm transition-colors",
                value === stack
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground-subtle hover:bg-surface-hover",
              )}
            >
              {t(`design.stack.${value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
        <label className="flex flex-col gap-1.5 text-ui-sm font-medium">
          {t("design.directionsCount")}
          <Input
            type="number"
            min={3}
            max={5}
            value={count}
            onChange={(e) => setCount(Math.min(5, Math.max(3, Number(e.target.value) || 3)))}
            className="w-20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-ui-sm font-medium">
          {t("design.directionsScreens")}
          <Input
            value={screens}
            onChange={(e) => setScreens(e.target.value)}
            placeholder={DEFAULT_DIRECTION_SCREENS.join(", ")}
          />
        </label>
      </div>
      {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || !brief.trim() || titles.length < 3}>
        {busy ? t("design.generating") : t("design.directionsGenerate", { count })}
      </Button>
    </form>
  );
}
