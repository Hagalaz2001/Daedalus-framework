import { assertEquals } from "@std/assert";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { jobs } from "../mod.ts";
import { memoryQueue, pgBossQueue, type Queue } from "../queue.ts";
import { createTestApp } from "../../../shared/testing.ts";

const until = async (check: () => boolean, ms = 20_000) => {
  const end = Date.now() + ms;
  while (!check() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  if (!check()) throw new Error("timed out waiting for the job");
};

async function behavesLikeAQueue(queue: Queue) {
  const seen: unknown[] = [];
  let attempts = 0;
  await queue.work("demo.echo", (data) => Promise.resolve(void seen.push(data)));
  await queue.work("demo.flaky", () => {
    attempts++;
    return attempts < 3 ? Promise.reject(new Error("boom")) : Promise.resolve();
  });
  await queue.enqueue("demo.echo", { n: 1 });
  await until(() => seen.length === 1);
  assertEquals(seen[0], { n: 1 });
  await queue.enqueue("demo.flaky");
  await until(() => attempts === 3);
}

Deno.test("in-process queue: delivers jobs and retries failures", async () => {
  const queue = memoryQueue({ backoffMs: 10 });
  await behavesLikeAQueue(queue);
  await queue.stop();
});

Deno.test("pg-boss queue on Postgres: delivers jobs and retries failures", async () => {
  // PGlite served over TCP stands in for a real Postgres server.
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port: 54329, host: "127.0.0.1" });
  await server.start();
  const queue = await pgBossQueue("postgres://postgres:postgres@127.0.0.1:54329/postgres", {
    max: 1,
    retryDelaySeconds: 1,
  });
  try {
    await behavesLikeAQueue(queue);
  } finally {
    await queue.stop();
    await server.stop();
    await db.close();
  }
});

Deno.test("the module starts with the app and exposes jobs()", async () => {
  const t = await createTestApp();
  let ran = false;
  await jobs().work("demo.hello", () => Promise.resolve(void (ran = true)));
  await jobs().enqueue("demo.hello");
  await until(() => ran);
  await t.close();
});
