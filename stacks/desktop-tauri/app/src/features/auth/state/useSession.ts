import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { token } from '@/shared/lib/token'

export interface SessionUser {
  id: string
  name: string
  email: string
}

export const sessionKey = ['session'] as const

/** The signed-in user from GET /me, or null when there is no token or the server rejects it (the token is then dropped). */
export async function loadSession(): Promise<SessionUser | null> {
  if (!token.get()) return null
  const r = await api.GET('/me')
  if (r.response.status === 401) {
    await token.clear()
    return null
  }
  if (r.error !== undefined || !r.data) throw new Error('Could not load your account.')
  return { id: r.data.id, name: r.data.name, email: r.data.email }
}

/** `isPending` is true until the first check finishes. A network failure is an error the screen can retry. */
export function useSession() {
  const q = useQuery({ queryKey: sessionKey, queryFn: loadSession, retry: false, staleTime: Infinity })
  return { user: q.data ?? null, isPending: q.isPending, error: q.error, refetch: q.refetch }
}
