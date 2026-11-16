// Local configuration. Keys come from process env or a local .env (never committed; see .env.example).
import { parse } from "@std/dotenv";
import { LEMONADE_DEFAULT_BASE_URL } from "../shared/localAi.ts";

export interface StudioEnv {
  /** "auto" (default: Anthropic key, then Lemonade, then Ollama, then demo fixtures), or "anthropic", "lemonade", "ollama", "fake". */
  provider: string;
  anthropicKey: string | null;
  anthropicModel: string;
  ollamaHost: string;
  ollamaModel: string;
  /** Lemonade Server's OpenAI-compatible API, default http://localhost:13305/api/v1. */
  lemonadeBaseUrl: string;
  lemonadeApiKey: string | null;
  /** Pin a Lemonade model; empty means "whatever is loaded". */
  lemonadeModel: string;
  stitchKey: string | null;
  port: number;
}

/** Reads .env files in order (later files win) and merges them under real environment variables. */
export function loadEnv(files: string[], env: Record<string, string | undefined> = Deno.env.toObject()): StudioEnv {
  let merged: Record<string, string> = {};
  for (const file of files) {
    try {
      merged = { ...merged, ...parse(Deno.readTextFileSync(file)) };
    } catch {
      // No .env at this path: fine.
    }
  }
  const get = (key: string): string | undefined => env[key] || merged[key] || undefined;
  const anthropicKey = get("ANTHROPIC_API_KEY") ?? null;
  return {
    provider: get("STUDIO_PROVIDER") ?? "auto",
    anthropicKey,
    anthropicModel: get("ANTHROPIC_MODEL") ?? "claude-opus-5-5",
    ollamaHost: get("OLLAMA_HOST") ?? "http://127.0.0.1:11434",
    ollamaModel: get("OLLAMA_MODEL") ?? "qwen3-coder",
    lemonadeBaseUrl: get("LEMONADE_BASE_URL") ?? LEMONADE_DEFAULT_BASE_URL,
    lemonadeApiKey: get("LEMONADE_API_KEY") ?? null,
    lemonadeModel: get("LEMONADE_MODEL") ?? "",
    stitchKey: get("STITCH_API_KEY") ?? null,
    port: Number(get("STUDIO_PORT") ?? 4310),
  };
}

/** Fails early, with a readable message, for a pinned provider that cannot work. */
export function validateEnv(env: StudioEnv): void {
  const known = ["auto", "anthropic", "lemonade", "ollama", "fake"];
  if (!known.includes(env.provider)) throw new Error(`Unknown STUDIO_PROVIDER "${env.provider}". Use ${known.join(", ")}.`);
  if (env.provider === "anthropic" && !env.anthropicKey) {
    throw new Error("Set ANTHROPIC_API_KEY in studio/.env (see .env.example), or use STUDIO_PROVIDER=auto.");
  }
}
