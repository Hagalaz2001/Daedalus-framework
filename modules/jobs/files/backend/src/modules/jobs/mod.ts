import type { Module } from "../../shared/http/types.ts";
import { handlers, schedules } from "./handlers.ts";
import { memoryQueue, pgBossQueue, type Queue, useQueue } from "./queue.ts";

export { jobs } from "./queue.ts";

let queue: Queue | undefined;

export default {
  name: "jobs",
  async start(deps) {
    queue = deps.config.databaseUrl ? await pgBossQueue(deps.config.databaseUrl) : memoryQueue();
    for (const [name, handler] of Object.entries(handlers(deps))) await queue.work(name, handler);
    for (const [name, cron] of Object.entries(schedules)) await queue.schedule(name, cron);
    useQueue(queue);
  },
  async stop() {
    await queue?.stop();
    useQueue(undefined);
  },
} satisfies Module;
