// Chooses the model provider at call time. "auto" (the default) picks, in order: your Anthropic key, Lemonade (local),
// Ollama (local), and finally the fixtures with a "no AI configured" banner, so a first run with no subscription and no
// setup still opens and shows what the studio does. The developer can pin any available provider from the UI.
import type { StudioEnv } from "./env.ts";
import type { LocalAi } from "./localAi.ts";
import { createAnthropicProvider } from "./providers/anthropic.ts";
import { createFakeProvider } from "./providers/fake.ts";
import { createLemonadeProvider } from "./providers/lemonade.ts";
import { createOllamaProvider } from "./providers/ollama.ts";
import type { Provider } from "./providers/types.ts";

export type ProviderId = "anthropic" | "lemonade" | "ollama" | "fake";
export const AUTO_ORDER: ProviderId[] = ["anthropic", "lemonade", "ollama", "fake"];

export interface ProviderOption {
  id: ProviderId;
  label: string;
  available: boolean;
  /** Why it is or is not available, in plain words. */
  detail: string;
  note: string | null;
}
export interface ProviderState {
  /** What the developer pinned, or "auto". */
  selected: ProviderId | "auto";
  /** What a generation would use right now. */
  active: ProviderId;
  /** Set when only the fixtures are left: the UI shows a banner. */
  banner: "no-ai" | null;
  options: ProviderOption[];
}

const PROBE_TTL_MS = 5_000;
const isLoopback = (url: string) => /^(localhost|127(.d{1,3}){3}|[?::1]?)$/i.test(new URL(url).hostname);

export function createProviderManager(
  deps: { env: StudioEnv; localAi: LocalAi; fetchImpl?: typeof fetch; ollamaModels?: () => Promise<string[] | null> },
) {
  const { env, localAi } = deps;
  const doFetch = deps.fetchImpl ?? fetch;
  let selected: ProviderId | "auto" = (AUTO_ORDER as string[]).includes(env.provider) ? (env.provider as ProviderId) : "auto";
  let cache: { at: number; state: ProviderState } | null = null;

  const anthropic = env.anthropicKey ? createAnthropicProvider(env.anthropicKey, env.anthropicModel) : null;
  const lemonade = createLemonadeProvider({ client: localAi.client, model: () => localAi.activeModel(), fetchImpl: deps.fetchImpl });
  const ollama = createOllamaProvider(env.ollamaHost, env.ollamaModel, deps.fetchImpl);
  const fake = createFakeProvider();
  const byId: Record<ProviderId, Provider | null> = { anthropic, lemonade, ollama, fake };

  const ollamaTags = deps.ollamaModels ?? (async () => {
    try {
      const res = await doFetch(`${env.ollamaHost.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(2_000) });
      if (!res.ok) return null;
      const body = (await res.json()) as { models?: { name: string }[] };
      return (body.models ?? []).map((m) => m.name);
    } catch {
      return null;
    }
  });

  async function probe(): Promise<ProviderState> {
    if (cache && Date.now() - cache.at < PROBE_TTL_MS) return cache.state;
    // With a cloud key and nothing pinned the local servers are not even asked.
    const needLocal = selected !== "anthropic" && !(selected === "auto" && anthropic);
    const [health, tags] = needLocal ? await Promise.all([localAi.client.health(), ollamaTags()]) : [null, null];
    const lemonadeModel = health ? await localAi.activeModel() : "";
    const options: ProviderOption[] = [
      {
        id: "anthropic",
        label: `Anthropic ${env.anthropicModel}`,
        available: anthropic !== null,
        detail: anthropic ? "API key found in .env." : "Set ANTHROPIC_API_KEY in studio/.env to use it.",
        note: "Best quality. Your prompts and DESIGN.md go to Anthropic.",
      },
      {
        id: "lemonade",
        label: "Local AI (Lemonade)",
        available: !!lemonadeModel,
        detail: !needLocal
          ? "Not checked (a cloud key is configured)."
          : !health
          ? `Not running at ${localAi.client.base}.`
          : lemonadeModel
          ? `Ready: ${lemonadeModel}.`
          : "Running, but no chat model is loaded yet. Set one up from the panel.",
        // A server on another machine is not private: say so.
        note: isLoopback(localAi.client.base)
          ? (lemonade.note ?? null)
          : `Not on this computer: prompts are sent to ${new URL(localAi.client.base).host}.`,
      },
      {
        id: "ollama",
        label: `Ollama ${env.ollamaModel}`,
        available: !!tags?.some((n) => n === env.ollamaModel || n.startsWith(`${env.ollamaModel}:`)),
        detail: !needLocal
          ? "Not checked (a cloud key is configured)."
          : tags === null
          ? `Not running at ${env.ollamaHost}.`
          : tags.some((n) => n === env.ollamaModel || n.startsWith(`${env.ollamaModel}:`))
          ? "Ready."
          : `Running, but ${env.ollamaModel} is not pulled (ollama pull ${env.ollamaModel}).`,
        note: ollama.note ?? null,
      },
      {
        id: "fake",
        label: "Demo fixtures",
        available: true,
        detail: "Deterministic sample designs. No AI is involved.",
        note: fake.note ?? null,
      },
    ];
    const ok = (id: ProviderId) => options.find((o) => o.id === id)!.available;
    const active: ProviderId = selected === "auto" ? (AUTO_ORDER.find(ok) ?? "fake") : selected;
    const state: ProviderState = { selected, active, banner: active === "fake" && selected === "auto" ? "no-ai" : null, options };
    cache = { at: Date.now(), state };
    return state;
  }

  const provider: Provider = {
    id: "fake",
    label: "Studio model",
    async call(input) {
      const { active, options } = await probe();
      const p = byId[active];
      if (!p || !options.find((o) => o.id === active)?.available) {
        throw new Error(
          `${options.find((o) => o.id === active)?.label ?? active} is not available: ${
            options.find((o) => o.id === active)?.detail ?? ""
          }`,
        );
      }
      return p.call(input);
    },
  };

  return {
    provider,
    describe: probe,
    select(id: ProviderId | "auto") {
      if (id !== "auto" && !(AUTO_ORDER as string[]).includes(id)) throw new Error("Unknown provider.");
      selected = id;
      cache = null;
    },
    invalidate() {
      cache = null;
    },
  };
}

export type ProviderManager = ReturnType<typeof createProviderManager>;
