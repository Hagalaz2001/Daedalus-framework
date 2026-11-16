import type { StudioEnv } from "../env.ts";
import { createAnthropicProvider } from "./anthropic.ts";
import { createFakeProvider } from "./fake.ts";
import { createOllamaProvider } from "./ollama.ts";
import type { Provider } from "./types.ts";

/** Picks the provider named in the environment. Throws a readable error when its key is missing. */
export function createProvider(env: StudioEnv): Provider {
  switch (env.provider) {
    case "fake":
      return createFakeProvider();
    case "ollama":
      return createOllamaProvider(env.ollamaHost, env.ollamaModel);
    case "anthropic":
      if (!env.anthropicKey) throw new Error("Set ANTHROPIC_API_KEY in studio/.env (see .env.example), or set STUDIO_PROVIDER=ollama.");
      return createAnthropicProvider(env.anthropicKey, env.anthropicModel);
    default:
      throw new Error(`Unknown STUDIO_PROVIDER "${env.provider}". Use anthropic, ollama or fake.`);
  }
}

export type { Provider } from "./types.ts";
