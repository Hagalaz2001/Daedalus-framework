import { createApp, discoverModules } from "../app.ts";
import { loadConfig } from "./config/config.ts";
import { openTestDb } from "./db/client.ts";
import { addMember } from "./db/membership.ts";
import { silentLogger } from "./logging/logger.ts";

/** A complete app on a throwaway in-memory Postgres (PGlite) with the real migrations and every installed module. */
export async function createTestApp(env: Record<string, string> = {}) {
  const config = loadConfig({ APP_ENV: "test", RATE_LIMIT_PER_MINUTE: "100000", ...env });
  const { db, close } = await openTestDb();
  const modules = await discoverModules();
  const { app, deps } = await createApp({ config, db, logger: silentLogger }, modules);
  for (const m of modules) await m.start?.(deps);

  const json = { "content-type": "application/json" };
  let n = 0;

  /** Signs a new user up and in the way a mobile app does; returns headers to send with later requests. */
  async function signUp(name = `user${++n}`) {
    const email = `${name}@example.com`;
    const body = JSON.stringify({ email, password: "correct-horse-battery", name });
    const up = await app.request("/api/auth/sign-up/email", { method: "POST", headers: json, body });
    if (up.status !== 200) throw new Error(`sign-up failed: ${await up.text()}`);
    const res = await app.request("/api/auth/sign-in/email", { method: "POST", headers: json, body });
    const token = res.headers.get("set-auth-token");
    if (!token) throw new Error("no set-auth-token header");
    return { email, headers: { ...json, authorization: `Bearer ${token}` } };
  }

  return {
    app,
    deps,
    db,
    json,
    signUp,
    /** Puts a user into an organization with a role (what accepting an invitation does). */
    addMember: (organizationId: string, userId: string, role: string) => addMember(db, organizationId, userId, role),
    close: async () => {
      for (const m of modules) await m.stop?.();
      await close();
    },
  };
}
