import { createAuthClient } from 'better-auth/client'
import { apiBaseUrl, httpFetch } from '@/shared/api'
import { token } from '@/shared/lib/token'

// Better Auth endpoints (/api/auth/*) are not in the OpenAPI contract, so this is the one place besides the generated
// client that talks to the backend. The backend's bearer plugin returns the session token in the `set-auth-token`
// response header; it is kept by the Rust side (OS credential store) and sent on every request.
export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  fetchOptions: {
    customFetchImpl: httpFetch,
    auth: { type: 'Bearer', token: () => token.get() ?? '' },
    onSuccess: async (ctx) => {
      const t = ctx.response.headers.get('set-auth-token')
      if (t) await token.set(t)
    },
  },
})
