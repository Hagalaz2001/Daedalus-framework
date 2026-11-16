import { DIRECTION_FRAMES, type DirectionPlatform } from "../../../shared/design/index.ts";
import { useMemo } from "react";
import { cn } from "../kit.tsx";
import { previewSrcDoc, STATIC_CSP } from "./designBridge.ts";
import { useNearViewport } from "./useNearViewport.ts";

/** Thumbnail scale per platform: phones are tall and narrow, the web page is wide. */
export const DIRECTION_ZOOM: Record<DirectionPlatform, number> = { web: 0.19, ios: 0.36, android: 0.34 };

/**
 * One device frame of one screen. The iframe exists only while the cell is near the viewport; a script-free
 * sandbox (no allow-scripts, no same-origin) with a CSP, the page's own CSS reacting to data-platform.
 */
export function DirectionFrame({ html, platform, title, status }: {
  html: string | undefined;
  platform: DirectionPlatform;
  title: string;
  /** What to say when there is no page: waiting or blocked. */
  status: string;
}) {
  const frame = DIRECTION_FRAMES[platform];
  const zoom = DIRECTION_ZOOM[platform];
  const { ref, near } = useNearViewport<HTMLDivElement>("300px 500px");
  const srcDoc = useMemo(() => (html === undefined ? "" : previewSrcDoc(html, platform)), [html, platform]);
  const phone = platform !== "web";
  return (
    <div
      ref={ref}
      className={cn("relative shrink-0 overflow-hidden border border-border bg-white", phone && "shadow-sm")}
      style={{ width: frame.width * zoom, height: frame.height * zoom, borderRadius: frame.radius * zoom }}
    >
      {html !== undefined && near
        ? (
          <iframe
            title={title}
            sandbox=""
            srcDoc={srcDoc}
            {...{ csp: STATIC_CSP }}
            tabIndex={-1}
            loading="lazy"
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
        : (
          <div className="flex h-full items-center justify-center bg-background-alt p-2 text-center text-ui-xs text-foreground-subtle">
            {html === undefined ? status : ""}
          </div>
        )}
      {phone
        ? <span className="pointer-events-none absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-black/40" aria-hidden />
        : null}
    </div>
  );
}
