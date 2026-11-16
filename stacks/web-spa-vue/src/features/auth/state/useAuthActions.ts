import { authClient } from '../data/authClient'

const FALLBACK = 'That did not work. Check your details and try again.'

// Every action resolves to an error message (or null on success) so screens only render a string.
type Result = Promise<string | null>
const msg = (e: { message?: string } | null | undefined): string | null => (e ? (e.message ?? FALLBACK) : null)

export function useAuthActions() {
  return {
    signIn: async (email: string, password: string): Result => msg((await authClient.signIn.email({ email: email.trim(), password })).error),
    signUp: async (name: string, email: string, password: string): Result =>
      msg((await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })).error),
    signOut: async () => {
      await authClient.signOut()
    },
    /** Sends a reset link. The backend must configure `sendResetPassword` (see README). */
    requestPasswordReset: async (email: string): Result =>
      msg((await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/sign-in` })).error),
    updateName: async (name: string): Result => msg((await authClient.updateUser({ name: name.trim() })).error),
    /** Needs `user.deleteUser.enabled` on the backend's Better Auth config. */
    deleteAccount: async (): Result => msg((await authClient.deleteUser()).error),
  }
}
