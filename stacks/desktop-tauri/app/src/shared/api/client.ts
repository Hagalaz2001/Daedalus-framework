import { createApi, type Schemas } from '@app/api'
import { token } from '../lib/token'
import { httpFetch } from './http'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

// The only way features reach the backend: the typed client generated from contracts/openapi.yaml.
// createApi forwards its options to openapi-fetch, so the Rust-side fetch plugs in here.
export const api = createApi(apiBaseUrl, { fetch: httpFetch } as NonNullable<Parameters<typeof createApi>[1]>)

api.use({
  onRequest({ request }) {
    const t = token.get()
    if (t) request.headers.set('Authorization', `Bearer ${t}`)
    return request
  },
})

export type Note = Schemas['Note']

const UNREACHABLE = 'Cannot reach the server. Check your connection and try again.'
const messageOf = (error: unknown, fallback: string) => (error as { message?: string } | undefined)?.message ?? fallback

/** Turns an openapi-fetch result into data, or throws an Error whose message is fit to show. */
export async function unwrap<T>(result: Promise<{ data?: T; error?: unknown; response: Response }>, fallback: string): Promise<T> {
  let r
  try {
    r = await result
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (r.error !== undefined || !r.response.ok || r.data === undefined) throw new Error(messageOf(r.error, fallback))
  return r.data
}

/** For 204 responses. */
export async function ensureOk(result: Promise<{ error?: unknown; response: Response }>, fallback: string): Promise<void> {
  let r
  try {
    r = await result
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (r.error !== undefined || !r.response.ok) throw new Error(messageOf(r.error, fallback))
}
