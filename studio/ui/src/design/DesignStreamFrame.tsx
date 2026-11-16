import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectsT } from "../i18n.ts";
import { previewCsp } from "./designBridge.ts";
import { sanitizeBodyHtml, sanitizeCss } from "./designDomSanitize.ts";
import { progressiveDocument, replayPrefixes, type StreamFrame, type StreamStatus } from "./designStream.ts";

export const REPLAY_STEP_MS = 380;

/**
 * The page skeleton for a frame that is built up in place. The only script is ours, allowed by a
 * per-frame nonce, so a script smuggled into the design would still be blocked. Updates arrive by
 * postMessage and are diffed into the live DOM so the scroll position survives and only new nodes fade in.
 */
export function streamSrcDoc(nonce: string): string {
  const script = `var tok=document.getElementById("ds-tokens");
function sync(cur,next){var i=0;for(;i<next.childNodes.length;i++){var a=cur.childNodes[i],b=next.childNodes[i];
if(!a){var c=b.cloneNode(true);if(c.nodeType===1)c.classList.add("ds-in");cur.appendChild(c);continue}
if(a.nodeType!==b.nodeType||a.nodeName!==b.nodeName){cur.replaceChild(b.cloneNode(true),a);continue}
if(a.nodeType===3){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;continue}
if(a.nodeType===1){var at=b.attributes;for(var k=0;k<at.length;k++){if(at[k].name!=="class"&&a.getAttribute(at[k].name)!==at[k].value)a.setAttribute(at[k].name,at[k].value)}sync(a,b)}}
while(cur.childNodes.length>next.childNodes.length)cur.removeChild(cur.lastChild)}
addEventListener("message",function(e){var d=e.data;if(e.source!==parent||!d||d.t!=="ds"||typeof d.css!=="string"||typeof d.body!=="string"||d.body.length>2000000)return;
document.documentElement.classList.toggle("dark",d.theme==="dark");if(tok.textContent!==d.css)tok.textContent=d.css;var t=document.createElement("div");t.innerHTML=d.body;sync(document.body,t)});`;
  return `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="${
    previewCsp(nonce)
  }"><style id="ds-tokens"></style><style>@keyframes ds-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.ds-in{animation:ds-in .28s ease-out}@media (prefers-reduced-motion:reduce){.ds-in{animation:none}}</style><script nonce="${nonce}">${script}</script></head><body></body></html>`;
}

export const makeNonce = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Replays a finished page in Stitch's order: tokens, then the shell, then blocks, a few renders per second. */
export function useReplay(html: string | undefined, active: boolean): { prefix: string; finished: boolean } {
  const steps = useMemo(() => (html && active ? replayPrefixes(html) : []), [html, active]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (steps.length === 0) return;
    const timer = setInterval(() => setIndex((i) => (i >= steps.length ? i : i + 1)), REPLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [steps]);
  if (!html || !active) return { prefix: html ?? "", finished: true };
  return index >= steps.length ? { prefix: html, finished: true } : { prefix: steps[index] ?? "", finished: false };
}

/** A frame that builds itself: the iframe plus a status line taken from the section markers or headings. */
export function LiveFrameBody(
  { html, title, width, height, zoom, theme }: {
    html: string;
    title: string;
    width: number;
    height: number;
    zoom: number;
    theme: "light" | "dark";
  },
) {
  const { prefix, finished } = useReplay(html, true);
  return (
    <LiveBody
      source={prefix}
      finished={finished}
      title={title}
      width={width}
      height={height}
      zoom={zoom}
      theme={theme}
    />
  );
}

function useStatusText() {
  const t = useProjectsT();
  return (status: StreamStatus): string => {
    switch (status.kind) {
      case "tokens":
        return t("design.status.tokens");
      case "frame":
        return t("design.status.frame");
      case "section":
        return t("design.status.section", { name: status.name });
      case "content":
        return t("design.status.content");
      default:
        return "";
    }
  };
}

/** The artboard of a page being built, from a replay or from the agent's live write. */
export function LiveBody(
  { source, finished, title, width, height, zoom, theme }: {
    source: string;
    finished: boolean;
    title: string;
    width: number;
    height: number;
    zoom: number;
    theme: "light" | "dark";
  },
) {
  const [status, setStatus] = useState<StreamStatus>({ kind: "done" });
  const marked = useRef({ tokens: false, block: false });
  const text = useStatusText();
  const onFrame = useCallback((frame: StreamFrame) => {
    setStatus(frame.status);
    // Measurement marks: the first moment tokens, then the first block, were on screen for this frame.
    if (frame.css && !marked.current.tokens) {
      marked.current.tokens = true;
      performance.mark("design-first-tokens");
    }
    if (frame.blocks > 0 && !marked.current.block) {
      marked.current.block = true;
      performance.mark("design-first-block");
    }
  }, []);
  const label = text(status);
  return (
    <div className="relative h-full w-full">
      <StreamIframe
        source={source}
        finished={finished}
        title={title}
        width={width}
        height={height}
        zoom={zoom}
        theme={theme}
        onFrame={onFrame}
      />
      {!finished && label
        ? (
          <span
            role="status"
            className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-foreground/85 px-2.5 py-1 text-ui-xs text-background backdrop-blur"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            {label}
          </span>
        )
        : null}
    </div>
  );
}

export function StreamIframe({ source, finished, title, width, height, zoom, theme, onFrame }: {
  theme: "light" | "dark";
  source: string;
  finished: boolean;
  title: string;
  width: number;
  height: number;
  zoom: number;
  onFrame?: (frame: StreamFrame) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const page = useMemo(() => {
    const nonce = makeNonce();
    return { srcDoc: streamSrcDoc(nonce), csp: previewCsp(nonce) };
  }, []);
  const frame = useMemo(() => progressiveDocument(source, finished), [source, finished]);
  // The browser-side sanitiser runs on the batch that is about to be shown, never per token.
  const safe = useMemo(() => ({ css: sanitizeCss(frame.css), body: sanitizeBodyHtml(frame.body) }), [frame]);
  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage({ t: "ds", css: safe.css, body: safe.body, theme }, "*");
    performance.mark("design-stream-render");
    onFrame?.(frame);
  }, [ready, safe, frame, onFrame, theme]);
  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-scripts"
      srcDoc={page.srcDoc}
      {...{ csp: page.csp }}
      tabIndex={-1}
      onLoad={() => setReady(true)}
      className="block border-0 bg-white"
      style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
    />
  );
}
