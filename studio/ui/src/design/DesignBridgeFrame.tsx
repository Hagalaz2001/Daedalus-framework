import { useEffect, useMemo, useRef } from "react";
import { type BridgeMessage, bridgeSrcDoc, parseBridgeMessage, previewCsp } from "./designBridge.ts";

export interface BridgeMark {
  selector: string;
  kind: "working" | "done" | "clear";
  /** Changes whenever the mark should play again. */
  seq: number;
}

const makeNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * A design preview that can be clicked. Scripts run only by our nonce (the page has none of its own),
 * the frame has an opaque origin, and a message is accepted only from this frame's own window with the
 * "null" origin of a sandboxed srcdoc and one of the shapes parseBridgeMessage knows.
 */
export function BridgeFrame({ html, title, width, height, zoom, pick, mark, theme, onMessage }: {
  theme: "light" | "dark";
  html: string;
  title: string;
  width: number;
  height: number;
  zoom: number;
  pick: boolean;
  mark?: BridgeMark | undefined;
  onMessage: (message: BridgeMessage) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const page = useMemo(() => {
    const nonce = makeNonce();
    return { srcDoc: bridgeSrcDoc(html, nonce), csp: previewCsp(nonce) };
  }, [html]);
  const srcDoc = page.srcDoc;
  const callback = useRef(onMessage);
  callback.current = onMessage;
  const post = (data: unknown) => ref.current?.contentWindow?.postMessage(data, "*");

  useEffect(() => {
    ready.current = false;
    const listener = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || event.origin !== "null") return;
      const message = parseBridgeMessage(event.data);
      if (!message) return;
      if (message.t === "ready") ready.current = true;
      callback.current(message);
    };
    addEventListener("message", listener);
    return () => removeEventListener("message", listener);
  }, [srcDoc]);

  useEffect(() => {
    post({ t: "ds-mode", mode: pick ? "pick" : "static" });
  }, [pick, srcDoc]);
  useEffect(() => {
    post({ t: "ds-theme", theme });
  }, [theme, srcDoc]);
  useEffect(() => {
    if (mark) post({ t: "ds-mark", selector: mark.selector, kind: mark.kind });
  }, [mark?.selector, mark?.kind, mark?.seq, srcDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      {...{ csp: page.csp }}
      tabIndex={-1}
      onLoad={() => {
        post({ t: "ds-mode", mode: pick ? "pick" : "static" });
        post({ t: "ds-theme", theme });
        if (mark) post({ t: "ds-mark", selector: mark.selector, kind: mark.kind });
      }}
      className="block border-0 bg-white"
      style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
    />
  );
}
