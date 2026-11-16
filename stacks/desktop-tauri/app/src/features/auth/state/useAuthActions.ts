import { useQueryClient } from '@tanstack/react-query'
import { token } from '@/shared/lib/token'
import { authClient } from '../data/authClient'
import { sessionKey } from './useSession'

const FALLBACK = 'That did not work. Check your details and try again.'
const UNREACHABLE = 'Cannot reach the server. Check your connection and try again.'

// Every action resolves to an error message (or null on success) so screens only render a string.
type Result = Promise<string | null>

async function attempt(run: () => Promise<{ error?: { message?: string } | null }>): Result {
  try {
    const { error } = await run()
    return error ? (error.message ?? FALLBACK) : null
  } catch {
    return UNREACHABLE
  }
}

export function useAuthActions() {
  const qc = useQueryClient()
  return {
    signIn: async (email: string, password: string): Result => {
      const error = await attempt(() => authClient.signIn.email({ email: email.trim(), password }))
      if (error) return error
      if (!token.get()) return 'The server did not return a session token. Enable the bearer plugin on the backend.'
      await qc.invalidateQueries({ queryKey: sessionKey })
      return null
    },
    signOut: async () => {
      await authClient.signOut().catch(() => undefined)
      await token.clear()
      qc.clear()
      await qc.invalidateQueries({ queryKey: sessionKey })
    },
    updateName: async (name: string): Result => {
      const error = await attempt(() => authClient.updateUser({ name: name.trim() }))
      if (!error) await qc.invalidateQueries({ queryKey: sessionKey })
      return error
    },
  }
}
