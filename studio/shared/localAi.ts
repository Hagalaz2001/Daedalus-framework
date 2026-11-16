// Local AI: which model fits which machine. Pure (no Deno or browser APIs) so the server, the doctor command and the UI
// share one table. Numbers are measured peaks of the model process during a real design task with a 32k context on the
// CPU (Ryzen 9 3900), see docs/LOCAL-AI.md. Only models under permissive licences (Apache-2.0 or MIT) are listed.

const GB = 1024 ** 3;

export const LEMONADE_DEFAULT_BASE_URL = "http://localhost:13305/api/v1";
/** A design page is several thousand tokens of system prompt plus the page itself: smaller contexts fail on the first call. */
export const LOCAL_CONTEXT_SIZE = 32_768;
export const MIN_RAM_GB = 8;
export const MIN_FREE_DISK_GB = 15;

export type ModelLicence = "Apache-2.0" | "MIT";

export interface LocalModel {
  /** Name the studio registers the model under on a Lemonade server (`user.` models are added from a Hugging Face checkpoint). */
  name: string;
  label: string;
  /** Hugging Face `repo:file`. */
  checkpoint: string;
  /** Licence of the model weights, read from the model card. */
  licence: ModelLicence;
  /** Download size in bytes. */
  bytes: number;
  /** Peak memory while running with a 32k context: weights, KV cache and compute buffers. */
  runBytes: number;
  /** Offered only when asked for; never picked automatically. */
  optional?: boolean;
  /** Least dedicated graphics memory it needs (optional models). */
  minVramBytes?: number;
}

export const LOCAL_MODELS = {
  mimo9b: {
    name: "user.MiMo-V2.6-Distill-Qwen-9B-Q4_K_M",
    label: "MiMo V2.6 9B",
    checkpoint: "bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF:MiMo-V2.6-Distill-Qwen-9B-Q4_K_M.gguf",
    licence: "MIT",
    bytes: 5_841_049_120,
    runBytes: 10.0 * GB,
  },
  mimo9bSmall: {
    name: "user.MiMo-V2.6-Distill-Qwen-9B-IQ4_XS",
    label: "MiMo V2.6 9B (compact)",
    checkpoint: "bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF:MiMo-V2.6-Distill-Qwen-9B-IQ4_XS.gguf",
    licence: "MIT",
    bytes: 5_227_304_480,
    runBytes: 9.4 * GB,
  },
  qwen4b: {
    name: "user.Qwen3.5-4B-Q4_K_M",
    label: "Qwen3.5 4B",
    checkpoint: "bartowski/Qwen_Qwen3.5-4B-GGUF:Qwen_Qwen3.5-4B-Q4_K_M.gguf",
    licence: "Apache-2.0",
    bytes: 3_013_027_808,
    runBytes: 6.4 * GB,
  },
  qwen27b: {
    name: "user.Qwen3.8-27B-UD-IQ3_S",
    label: "Qwen3.8 27B (best quality)",
    checkpoint: "unsloth/Qwen3.8-27B-GGUF:Qwen3.8-27B-UD-IQ3_S.gguf",
    licence: "Apache-2.0",
    bytes: 12_040_883_104,
    runBytes: 13.6 * GB,
    optional: true,
    // Cards sold as 16 GB report a little under (15.9 on an RX 9060 XT).
    minVramBytes: 15 * GB,
  },
} as const satisfies Record<string, LocalModel>;

export const localModels = (): LocalModel[] => Object.values(LOCAL_MODELS);

export interface Memory {
  /** Installed RAM, in bytes. */
  totalBytes: number;
  /** RAM free right now, in bytes. */
  availableBytes: number;
  /** Dedicated memory of the best discrete GPU (or unified memory usable as such), in bytes; 0 when none. */
  gpuBytes: number;
}

export type NoFit = "low-memory" | "close-apps";

/**
 * Which model to recommend, by tier, never one that would make the computer swap:
 * - a GPU with 7.5 GB or more, or 16 GB of RAM or more (machines report a little under, hence 15): the 9B model,
 *   the compact quant when only that fits in the free memory;
 * - 8 to 15 GB of RAM: the 4B model;
 * - less, or not enough free right now: none (`close-apps` when closing programs would make room).
 */
export function chooseLocalModel(memory: Memory): { model: LocalModel } | { model: null; reason: NoFit } {
  const { mimo9b, mimo9bSmall, qwen4b } = LOCAL_MODELS;
  // On a discrete GPU the 9B process measured 6.6-6.9 GB (Vulkan): 7.5 GB of VRAM holds it.
  if (memory.gpuBytes >= 7.5 * GB) return { model: mimo9b };
  const tier = memory.totalBytes >= 15 * GB ? "9b" : memory.totalBytes >= 7.5 * GB ? "4b" : null;
  if (!tier) return { model: null, reason: "low-memory" };
  const room = Math.max(memory.availableBytes, memory.gpuBytes);
  const ladder: LocalModel[] = tier === "9b" ? [mimo9b, mimo9bSmall, qwen4b] : [qwen4b];
  const fits = ladder.find((m) => m.runBytes <= room);
  return fits ? { model: fits } : { model: null, reason: "close-apps" };
}

/**
 * Where a model runs here. llama.cpp puts what fits into graphics memory there and the rest in RAM, and pages the file
 * from disk when RAM runs short too, so a big model still runs, only slower: "gpu" fits the card, "ram" partly runs
 * from RAM (slower), "ssd" reads parts from disk (much slower).
 */
export function modelSpill(
  model: Pick<LocalModel, "runBytes" | "minVramBytes">,
  vramBytes: number,
  ramBytes: number,
): "gpu" | "ram" | "ssd" {
  if (vramBytes >= (model.minVramBytes ?? model.runBytes)) return "gpu";
  // Keep about 4 GB of RAM for the operating system and the studio.
  return vramBytes + Math.max(0, ramBytes - 4 * GB) >= model.runBytes ? "ram" : "ssd";
}

export interface Hardware {
  os: string;
  arch: string;
  cpu: string | null;
  ramBytes: number;
  availableRamBytes: number;
  /** Free space where the models live, in bytes; null when it could not be read. */
  freeDiskBytes: number | null;
  /** null when the OS does not expose it. */
  avx2: boolean | null;
  gpus: { name: string; vramBytes: number; integrated?: boolean }[];
  /** Apple Silicon: memory is shared with the GPU. */
  unifiedMemory: boolean;
  /** Ryzen AI processor detected (the NPU needs Lemonade's FLM/ONNX backends, see docs/LOCAL-AI.md). */
  ryzenAi: boolean;
}

export type Verdict = "recommended" | "workable" | "minimum" | "below-minimum";

export interface Assessment {
  tier: Verdict;
  model: LocalModel | null;
  reason: NoFit | null;
  /** Dedicated GPU memory used for the decision, in bytes. */
  gpuBytes: number;
  /** One line per check: ok, warning or problem. */
  checks: { level: "ok" | "warn" | "fail"; text: string }[];
  /** Where the optional 27B model would run, for a machine that has the room to try it. */
  bestQuality: "gpu" | "ram" | "ssd";
}

const gb = (bytes: number) => Math.round((bytes / GB) * 10) / 10;

export function assess(hw: Hardware): Assessment {
  const discrete = hw.gpus.filter((g) => !g.integrated).sort((a, b) => b.vramBytes - a.vramBytes)[0];
  // Apple Silicon: the GPU can use roughly two thirds of the unified memory.
  const gpuBytes = hw.unifiedMemory ? Math.floor(hw.ramBytes * 0.66) : (discrete?.vramBytes ?? 0);
  const pick = chooseLocalModel({ totalBytes: hw.ramBytes, availableBytes: hw.availableRamBytes, gpuBytes });
  const checks: Assessment["checks"] = [];
  const ram = hw.ramBytes / GB;
  checks.push(
    ram >= 31
      ? { level: "ok", text: `${gb(hw.ramBytes)} GB RAM: comfortable.` }
      : ram >= 15
      ? { level: "ok", text: `${gb(hw.ramBytes)} GB RAM: enough for a 9B model.` }
      : ram >= 7.5
      ? { level: "warn", text: `${gb(hw.ramBytes)} GB RAM: enough for a 4B model only; close other programs.` }
      : { level: "fail", text: `${gb(hw.ramBytes)} GB RAM: below the ${MIN_RAM_GB} GB minimum.` },
  );
  if (hw.freeDiskBytes === null) checks.push({ level: "warn", text: "Free disk space could not be read." });
  else {
    const need = pick.model ? Math.max(MIN_FREE_DISK_GB, gb(pick.model.bytes) + 8) : MIN_FREE_DISK_GB;
    checks.push(
      hw.freeDiskBytes / GB >= need
        ? { level: "ok", text: `${gb(hw.freeDiskBytes)} GB free disk: enough.` }
        : { level: "fail", text: `${gb(hw.freeDiskBytes)} GB free disk: ${need} GB are needed for the model and the runtime.` },
    );
  }
  checks.push(
    hw.arch !== "x86_64" && hw.arch !== "aarch64"
      ? { level: "fail", text: `${hw.arch}: a 64-bit processor is required.` }
      : hw.avx2 === false
      ? { level: "fail", text: "The processor has no AVX2: local models would be far too slow." }
      : hw.avx2 === null && hw.arch === "x86_64"
      ? { level: "warn", text: "AVX2 support could not be checked (nearly every processor since 2015 has it)." }
      : { level: "ok", text: `${hw.arch}${hw.avx2 ? " with AVX2" : ""}: supported.` },
  );
  if (hw.unifiedMemory) checks.push({ level: "ok", text: `Apple Silicon: ${gb(hw.ramBytes)} GB of memory shared with the GPU (Metal).` });
  else if (discrete) {
    checks.push({
      level: discrete.vramBytes >= 7.5 * GB ? "ok" : "warn",
      text: `${discrete.name}: ${gb(discrete.vramBytes)} GB of graphics memory${
        discrete.vramBytes >= 7.5 * GB ? "." : " (too little to help much; the processor does the work)."
      }`,
    });
  } else checks.push({ level: "warn", text: "No dedicated GPU found: the model runs on the processor (slow, but it works)." });
  if (hw.ryzenAi) checks.push({ level: "ok", text: "Ryzen AI processor: Lemonade can use the NPU for some models, see docs/LOCAL-AI.md." });

  const failed = checks.some((c) => c.level === "fail");
  const verdict: Verdict = failed || !pick.model
    ? "below-minimum"
    : hw.ramBytes >= 31 * GB || gpuBytes >= 11.5 * GB || (hw.unifiedMemory && ram >= 15)
    ? "recommended"
    : ram >= 15 || gpuBytes >= 7.5 * GB
    ? "workable"
    : "minimum";
  return {
    tier: verdict,
    model: pick.model,
    reason: "reason" in pick ? pick.reason : null,
    gpuBytes,
    checks,
    bestQuality: modelSpill(LOCAL_MODELS.qwen27b, gpuBytes, hw.ramBytes),
  };
}

export const humanBytes = (bytes: number): string => `${gb(bytes)} GB`;
