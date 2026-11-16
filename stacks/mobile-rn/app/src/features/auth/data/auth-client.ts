import { createAuthClient } from "better-auth/client";
import { API_URL } from "@/shared/api";
import { token } from "@/shared/lib/token";

/**
 * Better Auth client (/api/auth/*). The backend's bearer plugin returns the session token in the
 * `set-auth-token` response header; we keep it in secure storage and send it on every request.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    auth: { type: "Bearer", token: () => token.get() ?? "" },
    onSuccess: async (ctx) => {
      const t = ctx.response.headers.get("set-auth-token");
      if (t) await token.set(t);
    },
  },
});
