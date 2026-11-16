// Design lint, shown inline: one row per rule with the reason when it fails. Same rules the exporter enforces.
import { Check, X } from "lucide-react";
import { fixPrompt, type LintWarning } from "../../../shared/design/designLint.ts";
import { LINT_RULES } from "../../../shared/design/designLintStructure.ts";
import { Button } from "../kit.tsx";

export function ChecksPanel({ warnings, busy, onFix }: { warnings: LintWarning[]; busy: boolean; onFix: (instruction: string) => void }) {
  const failing = new Set(warnings.map((w) => w.id));
  const pass = LINT_RULES.length - failing.size;
  return (
    <div className="flex flex-col gap-3 overflow-auto p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-ui-sm font-semibold">Design checks</h3>
        <span className={failing.size ? "text-ui-xs text-warn" : "text-ui-xs text-ok"}>{pass}/{LINT_RULES.length} passed</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {LINT_RULES.map((rule) => {
          const bad = warnings.filter((w) => w.id === rule.id);
          return (
            <li key={rule.id} className="flex items-start gap-2 text-ui-xs">
              {bad.length
                ? <X className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-label="Failed" />
                : <Check className="mt-0.5 size-3.5 shrink-0 text-ok" aria-label="Passed" />}
              <span className={bad.length ? "text-foreground" : "text-foreground-subtle"}>
                {bad.length ? bad.map((w) => w.message).join(" ") : rule.label}
              </span>
            </li>
          );
        })}
      </ul>
      {warnings.length
        ? (
          <Button size="sm" disabled={busy} onClick={() => onFix(fixPrompt(warnings))}>
            Fix {warnings.length === 1 ? "this issue" : `these ${warnings.length} issues`}
          </Button>
        )
        : (
          <p className="text-ui-xs text-foreground-subtle">
            Tokens only, contrast 4.5:1, 44px targets, list states and real copy all hold.
          </p>
        )}
    </div>
  );
}
