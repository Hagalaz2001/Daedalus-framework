// Shared by every TypeScript app (web apps, backend). Types are generated from contracts/openapi.yaml.
import createClient from "openapi-fetch";
import type { components, paths } from "./schema.d.ts";

export type { components, paths };
export type Schemas = components["schemas"];

/**
 * Typed API client. Web apps pass `credentials: "include"` so the sign-in cookie is sent;
 * other callers pass `headers: { Authorization: "Bearer <token>" }`.
 */
export function createApi(baseUrl: string, init: { credentials?: RequestCredentials; headers?: HeadersInit } = {}) {
  return createClient<paths>({ baseUrl, ...init });
}
