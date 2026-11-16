import * as Sentry from "@sentry/deno";
import { AppError } from "../../shared/errors/problem.ts";
import type { Module } from "../../shared/http/types.ts";

export { Sentry };

/** Only unexpected errors are worth a report: an AppError (401, 404, validation...) is the API working as designed. */
export const reportable = (error: unknown) => !(error instanceof AppError) && error !== undefined;

export default {
  name: "error-tracking",
  setup: ({ config }) => {
    const dsn = Deno.env.get("SENTRY_DSN");
    if (dsn) {
      Sentry.init({ dsn, environment: config.env, release: Deno.env.get("SENTRY_RELEASE") });
    }
  },
  middleware: () => [
    async (c, next) => {
      await next();
      // Hono hands handler errors to the error handler and records them on the context.
      if (reportable(c.error)) Sentry.captureException(c.error, { tags: { requestId: c.get("requestId") } });
    },
  ],
} satisfies Module;
