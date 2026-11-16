import { createAuthClient } from 'better-auth/react'
import { apiBaseUrl } from '@/shared/api'

// Sign up / sign in / sign out / session against the backend's /api/auth (Better Auth). Auth is not in the
// OpenAPI contract, so this is the one place besides the generated client that talks to the backend.
export const authClient = createAuthClient({ baseURL: apiBaseUrl, fetchOptions: { credentials: 'include' } })
