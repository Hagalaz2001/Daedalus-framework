import type { MiddlewareHandler } from "hono";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

/** One JSON object per line on stdout/stderr: easy to ship to any log platform. */
export function createLogger(minLevel: Level, write: (line: string, level: Level) => void = defaultWrite): Logger {
  const log = (level: Level) => (msg: string, fields: Record<string, unknown> = {}) => {
    if (order[level] < order[minLevel]) return;
    write(JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }), level);
  };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}

function defaultWrite(line: string, level: Level) {
  (level === "error" || level === "warn" ? console.error : console.log)(line);
}

export const silentLogger: Logger = createLogger("error", () => {});

/** Logs one line per request with the request id set by hono's requestId middleware. */
export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    await next();
    logger.info("request", {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      ms: Math.round(performance.now() - start),
    });
  };
}
