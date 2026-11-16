import { computed } from 'vue'
import { authClient } from '../data/authClient'

export interface SessionUser {
  id: string
  name: string
  email: string
}

/** Current user. `isPending` is true until the first session check finishes. */
export function useSession() {
  const s = authClient.useSession()
  return {
    user: computed(() => (s.value.data?.user as SessionUser | undefined) ?? null),
    isPending: computed(() => s.value.isPending),
  }
}
