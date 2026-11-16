import { assert, assertEquals } from "@std/assert";
import * as Sentry from "@sentry/deno";
import { Hono } from "hono";
import { AppError } from "../../../shared/errors/problem.ts";
import mod, { reportable } from "../mod.ts";

Deno.test("only unexpected errors are reportable", () => {
  assert(reportable(new Error("boom")));
  assert(!reportable(new AppError(404, "Not Found")));
  assert(!reportable(undefined));
});

Deno.test("an unexpected error reaches Sentry with the request id; expected ones do not", async () => {
  const events: Sentry.ErrorEvent[] = [];
  Sentry.init({ dsn: "https://public@example.com/1", beforeSend: (e) => (events.push(e), null) });

  const app = new Hono<{ Variables: { requestId: string } }>();
  app.use("*", (c, next) => (c.set("requestId", "req-42"), next()));
  // The module's middleware sits after the request-id middleware, like in the real app.
  for (const mw of mod.middleware()) app.use("*", mw as never);
  app.get("/boom", () => {
    throw new Error("kaboom");
  });
  app.get("/missing", () => {
    throw new AppError(404, "Not Found");
  });
  app.onError((_e, c) => c.text("error", 500));

  await app.request("/boom");
  await app.request("/missing");
  await Sentry.flush(2000);
  assertEquals(events.length, 1);
  assertEquals(events[0]?.tags?.["requestId"], "req-42");
  await Sentry.close(2000);
});
