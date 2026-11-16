import { createApi, type Schemas } from '@app/api'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

// The only way this app talks to the backend: the typed client generated from contracts/openapi.yaml.
// `credentials: "include"` sends the sign-in cookie set by /api/auth.
export const api = createApi(apiBaseUrl, { credentials: 'include' })

export type Note = Schemas['Note']

/** Turn an openapi-fetch result into data or a readable Error (so TanStack Query shows its error state). */
export function unwrap<T>(res: { data?: T; error?: { message?: string } }, fallback: string): T {
  if (res.error || res.data === undefined) throw new Error(res.error?.message ?? fallback)
  return res.data
}

/** For 204 responses. */
export function ensureOk(res: { error?: { message?: string } }, fallback: string): void {
  if (res.error) throw new Error(res.error.message ?? fallback)
}
