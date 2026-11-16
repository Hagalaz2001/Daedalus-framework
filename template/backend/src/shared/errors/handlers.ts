import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Logger } from "../logging/logger.ts";
import { AppError, notFound, problem } from "./problem.ts";

export const onNotFound: NotFoundHandler = (c) =>
  problem(c, notFound(`No route for ${c.req.method} ${new URL(c.req.url).pathname}`));

/** Known errors keep their status; anything else is logged and returned as a generic 500 (no internals leak). */
export const onError = (logger: Logger): ErrorHandler => (err, c) => {
  if (err instanceof AppError) return problem(c, err);
  if (err instanceof HTTPException) return problem(c, new AppError(err.status as 400, err.message || "Error"));
  logger.error("unhandled error", { requestId: c.get("requestId"), error: String(err), stack: (err as Error).stack });
  return problem(c, new AppError(500, "Internal Server Error", "Something went wrong"));
};
