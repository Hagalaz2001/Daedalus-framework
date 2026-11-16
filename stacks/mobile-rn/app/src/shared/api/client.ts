import { createApi } from "@app/api";
import { token } from "../lib/token";
import { API_URL } from "./config";

/** The only way features reach the backend: the client generated from contracts/openapi.yaml. */
export const api = createApi(API_URL);

api.use({
  onRequest({ request }) {
    const t = token.get();
    if (t) request.headers.set("Authorization", `Bearer ${t}`);
    return request;
  },
});

/** Turns an openapi-fetch result into data, or throws an Error whose message is fit to show. */
export async function unwrap<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let r;
  try {
    r = await result;
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (r.error !== undefined || !r.response.ok) {
    const message = (r.error as { message?: string } | undefined)?.message;
    throw new Error(message ?? `Request failed (${r.response.status}).`);
  }
  return r.data as T;
}
