import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { token } from "@/shared/lib/token";
import { authClient } from "../data/auth-client";

export type User = { id: string; name: string; email: string };
export type AuthStatus = "loading" | "signedOut" | "signedIn";

export type Auth = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);
const FAILED = "That did not work. Check your details and try again.";

/** Turns a Better Auth result into success or an Error with a message fit to show. */
function ensure(result: { error?: { message?: string | undefined } | null }) {
  if (result.error) throw new Error(result.error.message ?? FAILED);
}

async function attempt<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Error && e.message !== "Failed to fetch" && !/network/i.test(e.message)) throw e;
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    const { data } = await authClient.getSession();
    if (data?.user) {
      setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
      setStatus("signedIn");
    } else {
      await token.clear();
      setUser(null);
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    void token.restore().then(async (t) => {
      if (!t) return setStatus("signedOut");
      try {
        await load();
      } catch {
        // Offline at start-up: keep the token, show sign-in; it is retried at the next launch.
        setStatus("signedOut");
      }
    });
  }, [load]);

  const leave = useCallback(async () => {
    await token.clear();
    queryClient.clear();
    setUser(null);
    setStatus("signedOut");
  }, [queryClient]);

  const value = useMemo<Auth>(() => ({
    status,
    user,
    signIn: (email, password) =>
      attempt(async () => {
        ensure(await authClient.signIn.email({ email, password }));
        await load();
      }),
    signUp: (name, email, password) =>
      attempt(async () => {
        ensure(await authClient.signUp.email({ name, email, password }));
        await load();
      }),
    signOut: async () => {
      try {
        await authClient.signOut();
      } finally {
        await leave();
      }
    },
    requestPasswordReset: (email) => attempt(async () => ensure(await authClient.requestPasswordReset({ email }))),
    deleteAccount: () =>
      attempt(async () => {
        ensure(await authClient.deleteUser());
        await leave();
      }),
  }), [status, user, load, leave]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const a = useContext(AuthContext);
  if (!a) throw new Error("useAuth needs <AuthProvider>");
  return a;
}
