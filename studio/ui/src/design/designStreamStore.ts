// A tiny external store for the HTML the agent is writing right now. Only the artboard that shows a
// key subscribes to it, so a burst of updates re-renders that frame and nothing else.
import { useSyncExternalStore } from "react";

export interface LiveWrite {
  /** The partial (or, once done, whole) file content seen so far. */
  html: string;
  done: boolean;
  /** performance.now() of the first partial seen for this key. */
  firstAt: number;
}

const entries = new Map<string, LiveWrite>();
const listeners = new Map<string, Set<() => void>>();
/** Keys that were seen streaming: the studio must not replay them when the finished file lists. */
const streamed = new Set<string>();

const notify = (key: string) => listeners.get(key)?.forEach((listener) => listener());

export function publishLiveWrite(key: string, html: string, done: boolean): void {
  const previous = entries.get(key);
  if (previous && previous.html === html && previous.done === done) return;
  streamed.add(key);
  entries.set(key, { html, done, firstAt: previous?.firstAt ?? performance.now() });
  notify(key);
}

export function clearLiveWrite(key: string): void {
  if (entries.delete(key)) notify(key);
}

export const wasStreamed = (key: string): boolean => streamed.has(key);

export function useLiveWrite(key: string): LiveWrite | undefined {
  return useSyncExternalStore(
    (listener) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => set.delete(listener);
    },
    () => entries.get(key),
    () => undefined,
  );
}
