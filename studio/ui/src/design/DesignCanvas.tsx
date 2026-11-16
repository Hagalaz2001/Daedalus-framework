import type { DesignFileInfo, DesignScreen } from "../../../shared/design/index.ts";
import { Loader2, TriangleAlert } from "lucide-react";
import { useMemo, useRef } from "react";

import { cn } from "../kit.tsx";
import { useProjectsT } from "../i18n.ts";
import { BridgeFrame, type BridgeMark } from "./DesignBridgeFrame.tsx";
import { type BridgeMessage, trustedScriptSrcDoc } from "./designBridge.ts";
import { LiveBody, LiveFrameBody } from "./DesignStreamFrame.tsx";
import { useNearViewport } from "./useNearViewport.ts";
import { useLiveWrite } from "./designStreamStore.ts";

export interface CanvasItem {
  file: string;
  /** Where it came from: the step that asked for it and the variant it descends from. */
  from?: string;
  info?: DesignFileInfo;
}

/** Every file the manifest expects, written or not, in the order the steps asked for them. */
export function canvasItems(screen: DesignScreen): CanvasItem[] {
  const written = new Map(screen.files.map((f) => [f.file, f]));
  return [...new Set(screen.manifest.steps.flatMap((s) => s.files.map((file) => `${s.parent ?? ""}|${file}`)))].map((key) => {
    const [from, file] = key.split("|") as [string, string];
    return { file, ...(from ? { from } : {}), ...(written.get(file) ? { info: written.get(file)! } : {}) };
  });
}

/** Drag on empty canvas to pan sideways, like a design tool; wheel and scrollbars keep working. */
function usePan() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  return {
    ref,
    onPointerDown: (event: React.PointerEvent) => {
      if (event.target !== event.currentTarget || !ref.current) return;
      drag.current = { x: event.clientX, y: event.clientY, left: ref.current.scrollLeft, top: ref.current.scrollTop };
      ref.current.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (!drag.current || !ref.current) return;
      ref.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
      ref.current.scrollTop = drag.current.top - (event.clientY - drag.current.y);
    },
    onPointerUp: () => {
      drag.current = null;
    },
  };
}

const name = (file: string) => file.replace(/\.html$/, "");

function Frame({ slug, item, html, width, height, radius, zoom, selected, warnings, fresh, pick, mark, theme, onBridge, onSelect }: {
  theme: "light" | "dark";
  slug: string;
  pick: boolean;
  mark: BridgeMark | undefined;
  onBridge: (message: BridgeMessage) => void;
  item: CanvasItem;
  /** Arrived while the studio was open: build it up on screen instead of snapping it in. */
  fresh: boolean;
  html: string | undefined;
  width: number;
  height: number;
  radius: number;
  zoom: number;
  selected: boolean;
  warnings: number;
  onSelect: () => void;
}) {
  const t = useProjectsT();
  const live = useLiveWrite(`${slug}/${item.file}`);
  const srcDoc = useMemo(() => (html === undefined || !item.info?.scripts ? "" : trustedScriptSrcDoc(html)), [html, item.info?.scripts]);
  const blocked = item.info && !item.info.ok;
  const { ref, near } = useNearViewport<HTMLDivElement>();
  return (
    <figure className="m-0 shrink-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="mb-2 flex w-full items-baseline gap-2 text-left text-ui-sm"
      >
        <span className={cn("font-medium", selected ? "text-foreground" : "text-foreground-subtle")}>{name(item.file)}</span>
        {item.from ? <span className="text-ui-xs text-foreground-subtle">{t("design.from", { parent: name(item.from) })}</span> : null}
        {warnings > 0
          ? (
            <span className="ml-auto flex items-center gap-1 text-ui-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="size-3" aria-hidden />
              {warnings}
            </span>
          )
          : null}
      </button>
      <div
        ref={ref}
        className={cn(
          "overflow-hidden border bg-white transition-shadow",
          selected ? "border-brand shadow-lg ring-2 ring-brand/40" : "border-border",
        )}
        style={{ width: width * zoom, height: height * zoom, borderRadius: radius * zoom }}
      >
        {!near ? <div className="h-full w-full bg-background-alt" aria-hidden /> : live && (!live.done || html === undefined)
          ? (
            <LiveBody
              source={live.html}
              finished={live.done}
              title={t("design.frameTitle", { name: name(item.file) })}
              width={width}
              height={height}
              zoom={zoom}
              theme={theme}
            />
          )
          : html !== undefined && !blocked && fresh
          ? (
            <LiveFrameBody
              html={html}
              title={t("design.frameTitle", { name: name(item.file) })}
              width={width}
              height={height}
              zoom={zoom}
              theme={theme}
            />
          )
          : html !== undefined && !blocked && !item.info?.scripts
          ? (
            <BridgeFrame
              html={html}
              title={t("design.frameTitle", { name: name(item.file) })}
              width={width}
              height={height}
              zoom={zoom}
              pick={pick && selected}
              mark={mark}
              theme={theme}
              onMessage={onBridge}
            />
          )
          : html !== undefined && !blocked
          ? (
            // Opaque origin; scripts only for Stitch imports whose Tailwind runtime was inlined. The CSP blocks all network use.
            <iframe
              title={t("design.frameTitle", { name: name(item.file) })}
              sandbox={item.info?.scripts ? "allow-scripts" : ""}
              srcDoc={srcDoc}
              tabIndex={-1}
              className="block border-0 bg-white"
              style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
            />
          )
          : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-background-alt p-6 text-center text-ui-sm text-foreground-subtle">
              {blocked
                ? (
                  <>
                    <TriangleAlert className="size-5 text-amber-600" aria-hidden />
                    <span className="font-medium text-foreground">{t("design.blocked")}</span>
                    <span>{item.info?.problems.join(" ")}</span>
                  </>
                )
                : (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    <span>{t("design.waiting")}</span>
                  </>
                )}
            </div>
          )}
      </div>
    </figure>
  );
}

export function DesignCanvas({ screen, htmlByFile, selected, zoom, warnings, fresh, pick, marks, theme, frame, onBridge, onSelect }: {
  theme: "light" | "dark";
  frame: { width: number; height: number; radius: number };
  screen: DesignScreen;
  pick: boolean;
  marks: Record<string, BridgeMark>;
  onBridge: (file: string, message: BridgeMessage) => void;
  fresh: ReadonlySet<string>;
  htmlByFile: Record<string, string>;
  selected: string | null;
  zoom: number;
  warnings: Record<string, number>;
  onSelect: (file: string) => void;
}) {
  const pan = usePan();
  const items = canvasItems(screen);
  return (
    <div
      ref={pan.ref}
      onPointerDown={pan.onPointerDown}
      onPointerMove={pan.onPointerMove}
      onPointerUp={pan.onPointerUp}
      onPointerCancel={pan.onPointerUp}
      className="canvas-grid flex h-full cursor-grab items-start gap-10 overflow-auto p-10 active:cursor-grabbing"
    >
      {items.map((item) => (
        <Frame
          key={item.file}
          slug={screen.slug}
          item={item}
          html={htmlByFile[item.file]}
          {...frame}
          zoom={zoom}
          theme={theme}
          fresh={fresh.has(`${screen.slug}/${item.file}`)}
          pick={pick}
          mark={marks[item.file]}
          onBridge={(message) => onBridge(item.file, message)}
          selected={selected === item.file}
          warnings={warnings[item.file] ?? 0}
          onSelect={() => onSelect(item.file)}
        />
      ))}
    </div>
  );
}
