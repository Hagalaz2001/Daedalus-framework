import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An error that becomes an RFC 9457 `application/problem+json` response. */
export class AppError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public title: string,
    public detail?: string,
    public extensions: Record<string, unknown> = {},
  ) {
    super(detail ?? title);
  }
}

export const badRequest = (detail: string, errors?: unknown[]) =>
  new AppError(400, "Bad Request", detail, errors ? { errors } : {});
export const unauthorized = (detail = "Sign in to continue") => new AppError(401, "Unauthorized", detail);
export const forbidden = (detail = "You are not allowed to do this") => new AppError(403, "Forbidden", detail);
export const notFound = (detail = "Not found") => new AppError(404, "Not Found", detail);
export const conflict = (detail: string) => new AppError(409, "Conflict", detail);

/**
 * `message` repeats `detail` on purpose: generated clients and toasts read one field
 * regardless of which error produced it.
 */
export function problem(c: Context, e: AppError) {
  const body = {
    type: "about:blank",
    title: e.title,
    status: e.status,
    detail: e.detail,
    message: e.detail ?? e.title,
    instance: new URL(c.req.url).pathname,
    requestId: c.get("requestId"),
    ...e.extensions,
  };
  return c.body(JSON.stringify(body), e.status, { "content-type": "application/problem+json" });
}
