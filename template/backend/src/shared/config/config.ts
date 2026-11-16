export interface Config {
  env: "development" | "test" | "production";
  port: number;
  /** Real database when set (Postgres: DATABASE_URL; MongoDB flavour: MONGODB_URI); otherwise the embedded one in `pgliteDir`. */
  databaseUrl: string | undefined;
  pgliteDir: string;
  authSecret: string;
  authUrl: string;
  /** Browser origins allowed to call the API with credentials. */
  trustedOrigins: string[];
  logLevel: "debug" | "info" | "warn" | "error";
  rateLimitPerMinute: number;
  /** Requests per minute per client address on /api/auth/* (sign in, sign up: password guessing). */
  authRateLimitPerMinute: number;
  /** Reverse proxies you control in front of the app: X-Forwarded-For is read that many entries from the end. 0 = none. */
  trustProxy: number;
  /** Emails of platform operators (admin module, feature flags). Not tied to any organization. */
  adminEmails: string[];
}

export class ConfigError extends Error {
  constructor(public problems: string[]) {
    super(`Invalid configuration:\n - ${problems.join("\n - ")}`);
  }
}

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";
const csv = (v: string | undefined, fallback: string) =>
  (v || fallback).split(",").map((s) => s.trim()).filter(Boolean);

/** Reads and validates the environment once at boot. Every problem is reported together. */
export function loadConfig(env: Record<string, string | undefined> = Deno.env.toObject()): Config {
  const problems: string[] = [];
  const mode = env["APP_ENV"] ?? "development";
  if (!["development", "test", "production"].includes(mode)) {
    problems.push(`APP_ENV must be development, test or production (got "${mode}")`);
  }
  const production = mode === "production";
  const num = (name: string, fallback: number) => {
    const raw = env[name];
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) problems.push(`${name} must be a positive integer`);
    return n;
  };
  const port = num("PORT", 8787);
  const rateLimitPerMinute = num("RATE_LIMIT_PER_MINUTE", 120);
  const authRateLimitPerMinute = num("AUTH_RATE_LIMIT_PER_MINUTE", 30);
  // "true" (older configs) means one proxy; a number is the hop count; unset or "false" trusts nobody.
  const proxyRaw = env["TRUST_PROXY"] ?? "";
  const trustProxy = proxyRaw === "true" ? 1 : proxyRaw === "" || proxyRaw === "false" ? 0 : Number(proxyRaw);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) {
    problems.push("TRUST_PROXY must be a number of proxies (0, 1, 2 ...), or true/false");
  }
  const authSecret = env["BETTER_AUTH_SECRET"] || (production ? "" : DEV_SECRET);
  if (authSecret.length < 32) {
    problems.push("BETTER_AUTH_SECRET must be set (32+ characters, e.g. `openssl rand -base64 32`)");
  }
  if (production && !env["BETTER_AUTH_URL"]) {
    problems.push("BETTER_AUTH_URL must be set in production (the API's public URL)");
  }
  if (production && !env["AUTH_TRUSTED_ORIGINS"]) problems.push("AUTH_TRUSTED_ORIGINS must be set in production");
  const level = env["LOG_LEVEL"] ?? "info";
  if (!["debug", "info", "warn", "error"].includes(level)) {
    problems.push("LOG_LEVEL must be debug, info, warn or error");
  }
  if (problems.length) throw new ConfigError(problems);
  return {
    env: mode as Config["env"],
    port,
    databaseUrl: env["DATABASE_URL"] || env["MONGODB_URI"] || undefined,
    pgliteDir: env["PGLITE_DIR"] || ".data/pglite",
    authSecret,
    authUrl: env["BETTER_AUTH_URL"] || `http://localhost:${port}`,
    trustedOrigins: csv(env["AUTH_TRUSTED_ORIGINS"], "http://localhost:5173"),
    logLevel: level as Config["logLevel"],
    rateLimitPerMinute,
    authRateLimitPerMinute,
    trustProxy,
    adminEmails: csv(env["ADMIN_EMAILS"], "").map((e) => e.toLowerCase()),
  };
}
