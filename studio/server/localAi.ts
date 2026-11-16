// Local AI orchestration: detect Lemonade, list its models, recommend one for this machine, and (on request) register,
// download and load it with progress. Nothing downloads without a click; the studio never touches a server it was not
// pointed at (LEMONADE_BASE_URL).
import {
  assess,
  type Assessment,
  type Hardware,
  humanBytes,
  LOCAL_CONTEXT_SIZE,
  type LocalModel,
  localModels,
  MIN_FREE_DISK_GB,
} from "../shared/localAi.ts";
import { collectHardware } from "./hardware.ts";
import { LemonadeClient, type LemonadeHealth, type LemonadeModel } from "./lemonade.ts";
import type { StudioEnv } from "./env.ts";

const SANITY_PROMPT = "What is 17*3? Reply with the number only.";
const HARDWARE_CACHE_MS = 5 * 60_000;

export type LocalProgress = {
  stage: "registering" | "downloading" | "loading" | "checking" | "done" | "failed" | "cancelled";
  model: string;
  percent: number | null;
  bytesDownloaded: number | null;
  bytesTotal: number | null;
  error: string | null;
};

export interface LocalAiStatus {
  base: string;
  reachable: boolean;
  version: string | null;
  loaded: LemonadeHealth["loaded"];
  models: LemonadeModel[];
  hardware: Hardware;
  assessment: Assessment;
  /** The catalogue with what this server already has. */
  catalogue: (LocalModel & { installed: boolean; loaded: boolean; recommended: boolean })[];
  progress: LocalProgress | null;
  installUrl: string;
}

/** Model names that cannot hold a chat: embeddings, rerankers, speech, OCR and image generation. */
const NON_CHAT = new Set([
  "embed",
  "embedding",
  "embeddings",
  "rerank",
  "reranker",
  "ocr",
  "whisper",
  "kokoro",
  "tts",
  "speech",
  "diffusion",
  "sd",
  "sdxl",
  "flux",
]);
export function isChatModelId(id: string): boolean {
  const parts = id.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return !parts.some((p) => NON_CHAT.has(p));
}

export interface LocalAiDeps {
  env: Pick<StudioEnv, "lemonadeBaseUrl" | "lemonadeApiKey" | "lemonadeModel">;
  fetchImpl?: typeof fetch;
  collect?: () => Promise<Hardware>;
  emit?: (progress: LocalProgress | null) => void;
}

export function createLocalAi(deps: LocalAiDeps) {
  const client = new LemonadeClient(deps.env.lemonadeBaseUrl, deps.env.lemonadeApiKey, deps.fetchImpl);
  const collect = deps.collect ?? collectHardware;
  let hardware: { at: number; value: Hardware } | null = null;
  let progress: LocalProgress | null = null;
  let abort: AbortController | null = null;

  const setProgress = (p: LocalProgress | null) => {
    progress = p;
    deps.emit?.(p);
  };
  const getHardware = async () => {
    if (!hardware || Date.now() - hardware.at > HARDWARE_CACHE_MS) {
      hardware = { at: Date.now(), value: await collect() };
    }
    return hardware.value;
  };

  /** The model chats should use right now: the configured one, else the first loaded chat model. Empty when none. */
  async function activeModel(): Promise<string> {
    if (deps.env.lemonadeModel) return deps.env.lemonadeModel;
    const health = await client.health();
    return health?.loaded.find((m) => isChatModelId(m.model))?.model ?? "";
  }

  async function status(): Promise<LocalAiStatus> {
    const [health, hw] = await Promise.all([client.health(), getHardware()]);
    const loadedNames = new Set(health?.loaded.map((m) => m.model));
    const models = health ? await client.models(loadedNames).catch(() => []) : [];
    const assessment = assess(hw);
    const have = new Map(models.map((m) => [m.name, m]));
    return {
      base: client.base,
      reachable: health !== null,
      version: health?.version ?? null,
      loaded: health?.loaded ?? [],
      models: models.filter((m) => isChatModelId(m.name)),
      hardware: hw,
      assessment,
      catalogue: localModels().map((m) => ({
        ...m,
        installed: have.get(m.name)?.downloaded === true,
        loaded: loadedNames.has(m.name),
        recommended: assessment.model?.name === m.name,
      })),
      progress,
      installUrl: "https://lemonade-server.ai/",
    };
  }

  /** Starts the set-up in the background and returns at once; progress arrives through `emit` and `status()`. */
  async function setUp(modelName?: string): Promise<void> {
    if (progress && ["registering", "downloading", "loading", "checking"].includes(progress.stage)) {
      throw new Error("A model is already being set up.");
    }
    const hw = await getHardware();
    const model = modelName ? localModels().find((m) => m.name === modelName) : assess(hw).model;
    if (!model) {
      throw new Error(
        modelName
          ? `Unknown model ${modelName}.`
          : "This computer has too little memory for a local model (see docs/LOCAL-AI.md).",
      );
    }
    const health = await client.health();
    if (!health) {
      throw new Error(
        `Lemonade is not running at ${client.base}. Install it from https://lemonade-server.ai/ and start it, or change LEMONADE_BASE_URL.`,
      );
    }
    const ctl = (abort = new AbortController());
    const base: LocalProgress = {
      stage: "registering",
      model: model.name,
      percent: null,
      bytesDownloaded: null,
      bytesTotal: null,
      error: null,
    };
    setProgress(base);
    void (async () => {
      try {
        const have = (await client.models()).find((m) => m.name === model.name);
        if (!have?.downloaded) {
          if (hw.freeDiskBytes !== null && hw.freeDiskBytes < model.bytes + 2 * 1024 ** 3) {
            throw new Error(
              `Not enough free disk space: ${humanBytes(model.bytes)} are needed for ${model.label}, ${
                humanBytes(hw.freeDiskBytes)
              } are free (the minimum is ${MIN_FREE_DISK_GB} GB).`,
            );
          }
          setProgress({ ...base, stage: "downloading" });
          await client.pull(model.name, (p) => setProgress({ ...base, stage: "downloading", ...p }), ctl.signal, {
            checkpoint: model.checkpoint,
            recipe: "llamacpp",
            labels: ["custom"],
          });
        }
        setProgress({ ...base, stage: "loading", percent: 100 });
        await client.load(model.name, LOCAL_CONTEXT_SIZE);
        setProgress({ ...base, stage: "checking", percent: 100 });
        const answer = await client.ask(model.name, SANITY_PROMPT);
        if (!/\b51\b/.test(answer)) {
          throw new Error(
            `The model loaded but answered "${
              answer.slice(0, 40)
            }" to a simple sum. Its GPU backend may be broken: try the compact model or the CPU backend (see docs/LOCAL-AI.md).`,
          );
        }
        setProgress({ ...base, stage: "done", percent: 100 });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") setProgress({ ...base, stage: "cancelled" });
        else {setProgress({
            ...base,
            stage: "failed",
            error: (e instanceof Error ? e.message : String(e)).slice(0, 400),
          });}
      } finally {
        abort = null;
      }
    })();
  }

  return {
    client,
    status,
    setUp,
    activeModel,
    cancel: () => abort?.abort(),
    unload: async () => {
      await client.unload();
      setProgress(null);
    },
    progress: () => progress,
  };
}

export type LocalAi = ReturnType<typeof createLocalAi>;
