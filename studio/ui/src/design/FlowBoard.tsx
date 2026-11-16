// Flow board: every screen of the project on one canvas, with arrows for the user flow. Arrows are saved in
// design/studio/flow.json. Frames are script-free previews (no sandbox escape, no network).
import type { DesignScreen } from "../../../shared/design/index.ts";
import { Link2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, cn } from "../kit.tsx";
import { previewSrcDoc } from "./designBridge.ts";

interface Arrow {
  from: string;
  to: string;
  label?: string;
}

const COLS = 3;
const GAP = 120;
const CAPTION = 30;

/** The version of a screen that represents it on the board: the newest written file. */
export const representative = (screen: DesignScreen): string | null =>
  [...screen.files].filter((f) => f.ok).sort((a, b) => a.modifiedAt.localeCompare(b.modifiedAt)).at(-1)?.file ?? null;

export function FlowBoard({ screens, frame, theme, onOpen }: {
  screens: DesignScreen[];
  frame: { width: number; height: number; radius: number };
  theme: "light" | "dark";
  onOpen: (slug: string) => void;
}) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [html, setHtml] = useState<Record<string, string>>({});
  const [connect, setConnect] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/flow").then((r) => r.json()).then((f: { arrows: Arrow[] }) => setArrows(f.arrows ?? []), () => undefined);
  }, []);

  const key = screens.map((s) => `${s.slug}:${representative(s)}`).join("|");
  useEffect(() => {
    let live = true;
    for (const s of screens) {
      const file = representative(s);
      const k = `${s.slug}/${file}`;
      if (!file || html[k] !== undefined) continue;
      void fetch("/api/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: { kind: "read", slug: s.slug, file } }),
      })
        .then((r) => r.json())
        .then((text: string) => live && typeof text === "string" && setHtml((p) => ({ ...p, [k]: text })), () => undefined);
    }
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (next: Arrow[]) => {
    setArrows(next);
    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arrows: next }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const zoom = Math.min(0.42, 380 / frame.width);
  const cw = frame.width * zoom;
  const ch = frame.height * zoom;
  const pos = useMemo(
    () =>
      new Map(screens.map((s, i) => [s.slug, { x: 40 + (i % COLS) * (cw + GAP), y: 40 + Math.floor(i / COLS) * (ch + CAPTION + GAP) }])),
    [screens, cw, ch],
  );
  const width = 80 + Math.min(COLS, screens.length) * (cw + GAP);
  const height = 80 + Math.ceil(screens.length / COLS) * (ch + CAPTION + GAP);

  const click = (slug: string) => {
    if (!connect) return onOpen(slug);
    if (!from) return setFrom(slug);
    if (from !== slug && !arrows.some((a) => a.from === from && a.to === slug)) void save([...arrows, { from, to: slug }]);
    setFrom(null);
  };

  const path = (a: Arrow): { d: string; mx: number; my: number } | null => {
    const p = pos.get(a.from);
    const q = pos.get(a.to);
    if (!p || !q) return null;
    const sameRow = Math.abs(p.y - q.y) < 1;
    const x1 = q.x > p.x ? p.x + cw : p.x;
    const y1 = p.y + CAPTION + ch / 2;
    const x2 = q.x > p.x ? q.x : q.x + cw;
    const y2 = q.y + CAPTION + ch / 2;
    if (sameRow) return { d: `M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`, mx: (x1 + x2) / 2, my: y1 };
    const bx = p.x + cw / 2;
    const by = p.y + CAPTION + ch;
    const tx = q.x + cw / 2;
    const ty = q.y + CAPTION;
    return { d: `M${bx} ${by} C${bx} ${by + GAP / 2}, ${tx} ${ty - GAP / 2}, ${tx} ${ty}`, mx: (bx + tx) / 2, my: (by + ty) / 2 };
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2">
        <Button
          size="sm"
          variant={connect ? "secondary" : "outline"}
          aria-pressed={connect}
          onClick={() => {
            setConnect((c) => !c);
            setFrom(null);
          }}
        >
          <Link2 className="size-4" aria-hidden />Connect screens
        </Button>
        <span className="text-ui-xs text-foreground-subtle">
          {connect
            ? (from ? "Now click the screen it leads to." : "Click the screen the flow starts from.")
            : "Click a screen to open it. Arrows are saved in design/studio/flow.json."}
        </span>
        {error ? <span className="text-ui-xs text-destructive" role="alert">{error}</span> : null}
        <ul className="ml-auto flex flex-wrap gap-1.5">
          {arrows.map((a) => (
            <li key={`${a.from}>${a.to}`} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-ui-xs">
              {a.from} to {a.to}
              <button
                type="button"
                aria-label={`Remove arrow ${a.from} to ${a.to}`}
                onClick={() =>
                  void save(arrows.filter((x) =>
                    x !== a
                  ))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="canvas-grid min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width, height }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
            <defs>
              <marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 10 5 0 10z" fill="var(--brand)" />
              </marker>
            </defs>
            {arrows.map((a) => {
              const g = path(a);
              return g
                ? <path key={`${a.from}>${a.to}`} d={g.d} fill="none" stroke="var(--brand)" strokeWidth="2" markerEnd="url(#arrow-head)" />
                : null;
            })}
          </svg>
          {screens.map((s) => {
            const p = pos.get(s.slug)!;
            const file = representative(s);
            const page = file ? html[`${s.slug}/${file}`] : undefined;
            return (
              <figure key={s.slug} className="absolute m-0" style={{ left: p.x, top: p.y, width: cw }}>
                <button
                  type="button"
                  onClick={() => click(s.slug)}
                  className={cn("mb-2 block w-full truncate text-left text-ui-sm font-medium", from === s.slug && "text-brand")}
                >
                  {s.slug}
                </button>
                <div
                  className={cn("overflow-hidden border bg-white", from === s.slug ? "border-brand ring-2 ring-brand/40" : "border-border")}
                  style={{ width: cw, height: ch, borderRadius: frame.radius * zoom }}
                >
                  {page
                    ? (
                      <iframe
                        title={`Flow ${s.slug}`}
                        sandbox=""
                        srcDoc={previewSrcDoc(page, undefined, theme)}
                        tabIndex={-1}
                        className="block border-0 bg-white"
                        style={{
                          width: frame.width,
                          height: frame.height,
                          transform: `scale(${zoom})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      />
                    )
                    : <div className="grid h-full place-items-center text-ui-xs text-foreground-subtle">Waiting</div>}
                </div>
                {connect
                  ? (
                    <button
                      type="button"
                      aria-label={`Select ${s.slug}`}
                      onClick={() => click(s.slug)}
                      className="absolute inset-0 top-6 cursor-pointer opacity-0"
                    />
                  )
                  : null}
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
