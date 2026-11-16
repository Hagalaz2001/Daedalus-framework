import { createApi } from '@app/api'

/**
 * Backend health through the generated client. Null when the backend is unreachable (the footer then hides the badge).
 * `next.revalidate` keeps pages static and re-checks at most once a minute.
 */
export async function getApiStatus(): Promise<'ok' | null> {
  try {
    const api = createApi(process.env.API_BASE_URL ?? 'http://localhost:8787')
    const { data } = await api.GET('/health', { signal: AbortSignal.timeout(1500), next: { revalidate: 60 } } as Record<string, unknown>)
    return data?.status ?? null
  } catch {
    return null
  }
}
