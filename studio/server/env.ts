// Local configuration. Keys come from process env or a local .env (never committed; see .env.example).
import { parse } from "@std/dotenv";

export interface StudioEnv {
  /** "anthropic" | "ollama" | "fake". Defaults to anthropic when a key exists, else ollama. */
  provider: string;
  anthropicKey: string | null;
  anthropicModel: string;
  ollamaHost: string;
  ollamaModel: string;
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
    provider: get("STUDIO_PROVIDER") ?? (anthropicKey ? "anthropic" : "ollama"),
    anthropicKey,
    anthropicModel: get("ANTHROPIC_MODEL") ?? "claude-opus-5-5",
    ollamaHost: get("OLLAMA_HOST") ?? "http://127.0.0.1:11434",
    ollamaModel: get("OLLAMA_MODEL") ?? "qwen3-coder",
    stitchKey: get("STITCH_API_KEY") ?? null,
    port: Number(get("STUDIO_PORT") ?? 4310),
  };
}
