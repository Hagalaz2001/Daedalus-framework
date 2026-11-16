import { PgBoss } from "pg-boss";

export type Handler = (data: Record<string, unknown>) => Promise<void>;

export interface Queue {
  /** Run `name` soon (or after `delaySeconds`). Failed runs are retried with backoff, then dropped. */
  enqueue(name: string, data?: Record<string, unknown>, opts?: { delaySeconds?: number }): Promise<void>;
  /** Process `name` jobs with `handler`. */
  work(name: string, handler: Handler): Promise<void>;
  /** Run `name` on a cron schedule (UTC), e.g. "17 * * * *". */
  schedule(name: string, cron: string): Promise<void>;
  stop(): Promise<void>;
}

/**
 * In-process queue for the local database (PGlite): no persistence, no cron. Good enough to develop against the same
 * API; jobs queued here are lost on restart. shortcut: single process, upgrade by pointing DATABASE_URL at Postgres.
 */
export function memoryQueue(options: { retries?: number; backoffMs?: number } = {}): Queue {
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? 1000;
  const handlers = new Map<string, Handler>();
  const pending = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  const attempt = (name: string, data: Record<string, unknown>, n: number) => {
    const timer = setTimeout(async () => {
      pending.delete(timer);
      try {
        await handlers.get(name)?.(data);
      } catch (e) {
        if (n < retries && !stopped) attempt(name, data, n + 1);
        else console.error(JSON.stringify({ level: "error", msg: "job failed", job: name, error: String(e) }));
      }
    }, n === 0 ? 0 : backoffMs * 2 ** (n - 1));
    pending.add(timer);
  };

  return {
    enqueue(name, data = {}, opts) {
      const delay = (opts?.delaySeconds ?? 0) * 1000;
      const timer = setTimeout(() => (pending.delete(timer), attempt(name, data, 0)), delay);
      pending.add(timer);
      return Promise.resolve();
    },
    work(name, handler) {
      handlers.set(name, handler);
      return Promise.resolve();
    },
    schedule(name) {
      console.warn(
        JSON.stringify({ level: "warn", msg: "cron schedules need DATABASE_URL (pg-boss); skipped", job: name }),
      );
      return Promise.resolve();
    },
    stop() {
      stopped = true;
      for (const t of pending) clearTimeout(t);
      return Promise.resolve();
    },
  };
}

/** pg-boss on the application's Postgres: durable, multi-instance safe, retries with exponential backoff, cron. */
export async function pgBossQueue(
  connectionString: string,
  options: { max?: number; retryDelaySeconds?: number } = {},
): Promise<Queue> {
  const boss = new PgBoss({ connectionString, max: options.max });
  boss.on("error", (e) => console.error(JSON.stringify({ level: "error", msg: "pg-boss error", error: String(e) })));
  await boss.start();
  const created = new Set<string>();
  const ensure = async (name: string) => {
    if (!created.has(name)) {
      await boss.createQueue(name);
      created.add(name);
    }
  };
  return {
    async enqueue(name, data = {}, opts) {
      await ensure(name);
      await boss.send(name, data, {
        retryLimit: 3,
        retryDelay: options.retryDelaySeconds ?? 5,
        retryBackoff: true,
        startAfter: opts?.delaySeconds ?? 0,
      });
    },
    async work(name, handler) {
      await ensure(name);
      // A thrown error marks the job failed and pg-boss schedules the retry.
      await boss.work(name, { pollingIntervalSeconds: 1 }, async (jobs) => {
        for (const job of jobs) await handler((job.data ?? {}) as Record<string, unknown>);
      });
    },
    async schedule(name, cron) {
      await ensure(name);
      await boss.schedule(name, cron);
    },
    stop: () => boss.stop({ graceful: true }),
  };
}

let current: Queue | undefined;
export const useQueue = (q: Queue | undefined) => void (current = q);

/** The running queue: `await jobs().enqueue("email.digest", { userId })`. */
export function jobs(): Queue {
  if (!current) throw new Error("The jobs module has not started yet");
  return current;
}
