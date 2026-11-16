import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireTenant } from "../../shared/auth/session.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";

type Listener = (event: string, data: unknown) => void;
const channels = new Map<string, Set<Listener>>();

/**
 * Push an event to everyone connected in an organization: `publish(orgId, "note.created", { id })`.
 * shortcut: channels live in this process, so with several backend instances a client only hears events published on
 * its own instance. Fan out through Postgres LISTEN/NOTIFY or a broker before scaling out.
 */
export function publish(organizationId: string, event: string, data: unknown) {
  for (const listener of channels.get(organizationId) ?? []) listener(event, data);
}

export const subscribers = (organizationId: string) => channels.get(organizationId)?.size ?? 0;

export default {
  name: "realtime",
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/events", async (c) => {
      const { organizationId } = await requireTenant(c, db);
      return streamSSE(c, async (stream) => {
        const queue: { event: string; data: unknown }[] = [];
        let wake: (() => void) | undefined;
        const listener: Listener = (event, data) => (queue.push({ event, data }), wake?.());
        const set = channels.get(organizationId) ?? channels.set(organizationId, new Set()).get(organizationId)!;
        set.add(listener);
        stream.onAbort(() => {
          set.delete(listener);
          wake?.();
        });
        await stream.writeSSE({ event: "ready", data: "{}" });
        while (!stream.aborted && !stream.closed) {
          const next = queue.shift();
          if (next) await stream.writeSSE({ event: next.event, data: JSON.stringify(next.data) });
          else {
            await Promise.race([new Promise<void>((r) => (wake = r)), new Promise((r) => setTimeout(r, 25_000))]);
            if (!queue.length && !stream.aborted) await stream.write(": ping\n\n");
          }
        }
        set.delete(listener);
      });
    }),
} satisfies Module;
