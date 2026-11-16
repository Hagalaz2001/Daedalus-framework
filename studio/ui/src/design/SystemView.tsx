// The design system view: the project's tokens, contrast checks, visual presets, and a seed-colour generator.
// Every change goes through the diff dialog; nothing is written from here directly.
import { Check, Palette, X } from "lucide-react";
import { useMemo, useState } from "react";
import { contrastRatio, parseColor } from "../../../shared/design/designContrast.ts";
import { buildDesignMd } from "../../../shared/design/designMdGenerate.ts";
import { type Tokens, tokensFromDesignMd } from "../../../shared/design/tokens.ts";
import { Button, cn, Input } from "../kit.tsx";
import type { PlanView, StudioConfig } from "./designApi.ts";

const PAIRS: [string, string, string][] = [
  ["text", "surface", "Body text on surface"],
  ["textMuted", "surface", "Muted text on surface"],
  ["text", "surfaceMuted", "Text on muted surface"],
  ["onPrimary", "primary", "Label on primary"],
  ["primary", "surface", "Primary on surface (links)"],
  ["success", "surface", "Success on surface"],
  ["warning", "surface", "Warning on surface"],
  ["danger", "surface", "Danger on surface"],
];

function ratio(colors: Record<string, string>, fg: string, bg: string): number | null {
  const a = parseColor(colors[fg] ?? "");
  const b = parseColor(colors[bg] ?? "");
  return a && b ? contrastRatio(a, b) : null;
}

function Swatches({ colors, label }: { colors: Record<string, string>; label: string }) {
  return (
    <div>
      <h4 className="mb-2 text-ui-xs font-semibold uppercase tracking-wide text-foreground-subtle">{label}</h4>
      <ul className="grid grid-cols-5 gap-2">
        {Object.entries(colors).map(([name, value]) => (
          <li key={name} className="flex flex-col gap-1">
            <span className="h-12 rounded-lg border border-border" style={{ background: value }} />
            <span className="text-ui-xs font-medium">{name}</span>
            <span className="font-mono text-[11px] text-foreground-subtle">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const files = (tokens: Tokens, md: string | null) => [
  ...(md ? [{ path: "DESIGN.md", content: md }] : []),
  { path: "design/tokens.json", content: `${JSON.stringify(tokens, null, 2)}\n` },
];

export function SystemView({ config, onPlan, onDirections }: {
  config: StudioConfig;
  onPlan: (files: { path: string; content: string }[], title: string) => void;
  onDirections: () => void;
}) {
  const [seed, setSeed] = useState("#2f6f5e");
  const [name, setName] = useState(config.name);
  const [error, setError] = useState<string | null>(null);
  const tokens = config.tokens;
  const rows = useMemo(() => {
    if (!tokens) return [];
    return PAIRS.map(([fg, bg, label]) => ({
      label,
      light: ratio(tokens.color, fg, bg),
      dark: tokens.colorDark ? ratio(tokens.colorDark, fg, bg) : null,
    }));
  }, [tokens]);

  const fromSeed = async () => {
    try {
      const md = await buildDesignMd({ name: name.trim() || config.name, seed });
      const next = tokensFromDesignMd(md, tokens);
      if (!next) throw new Error("The generated DESIGN.md has no colours.");
      onPlan(files(next, md), "Apply generated design system");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 overflow-auto p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Palette className="size-5" aria-hidden />Design system
          </h2>
          <p className="mt-1 text-ui-sm text-foreground-subtle">
            {config.hasDesignMd
              ? "DESIGN.md and design/tokens.json are the source of truth. Every generated screen starts from them."
              : "No DESIGN.md yet. Start from a preset, a seed colour, or a brief."}
          </p>
        </div>
        <Button variant="outline" onClick={onDirections}>Explore directions from a brief</Button>
      </header>

      {tokens
        ? (
          <>
            <Swatches colors={tokens.color} label="Light" />
            {tokens.colorDark ? <Swatches colors={tokens.colorDark} label="Dark" /> : null}
            <section>
              <h3 className="mb-2 text-ui-sm font-semibold">Contrast (WCAG AA needs 4.5:1)</h3>
              <table className="w-full border-collapse text-ui-sm">
                <thead>
                  <tr className="text-left text-ui-xs text-foreground-subtle">
                    <th className="py-1.5 font-medium">Pair</th>
                    <th className="py-1.5 font-medium">Light</th>
                    <th className="py-1.5 font-medium">Dark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-border">
                      <td className="py-1.5">{r.label}</td>
                      {[r.light, r.dark].map((v, i) => (
                        <td key={i} className="py-1.5">
                          {v === null ? <span className="text-foreground-subtle">-</span> : (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 tabular-nums",
                                v >= 4.5 ? "text-ok" : "text-destructive",
                              )}
                            >
                              {v >= 4.5
                                ? <Check className="size-3.5" aria-hidden />
                                : <X className="size-3.5" aria-hidden />}
                              {v.toFixed(1)}:1
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )
        : null}

      <section>
        <h3 className="mb-1 text-ui-sm font-semibold">Visual presets</h3>
        <p className="mb-3 text-ui-xs text-foreground-subtle">
          Complete token sets. Pick one as the starting point and review the diff.
        </p>
        <ul className="grid grid-cols-3 gap-4">
          {config.presets.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-panel-2 p-4">
              <div className="flex h-16 overflow-hidden rounded-lg border border-border" aria-hidden>
                {["surface", "surfaceMuted", "primary", "text", "success", "danger"].map((k) => (
                  <span key={k} className="flex-1" style={{ background: p.tokens.color[k] }} />
                ))}
              </div>
              <div>
                <p className="text-ui-sm font-semibold">{p.name}</p>
                <p className="text-ui-xs text-foreground-subtle">{p.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onPlan(
                    [{ path: "design/tokens.json", content: `${JSON.stringify(p.tokens, null, 2)}\n` }],
                    `Use the ${p.name} preset`,
                  )}
              >
                Use this preset
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-panel-2 p-4">
        <h3 className="text-ui-sm font-semibold">Generate from a seed colour</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="Seed colour"
            className="h-9 w-11 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="System name"
            aria-label="System name"
            maxLength={40}
            className="max-w-xs"
          />
          <Button onClick={() => void fromSeed()}>Preview DESIGN.md and tokens</Button>
        </div>
        {error ? <p className="text-ui-sm text-destructive" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

export type { PlanView };
