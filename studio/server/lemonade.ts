// A small client for Lemonade Server (https://lemonade-server.ai/, Apache-2.0): health, models, hardware, pull, load,
// unload and a one-line sanity chat. The base URL is configurable (LEMONADE_BASE_URL), fetch is injected for tests.
// The OpenAI-compatible chat endpoint used for generation lives in providers/lemonade.ts.
import { LEMONADE_DEFAULT_BASE_URL } from "../shared/localAi.ts";

const QUICK_MS = 4_000;
const SLOW_MS = 60_000;
/** Loading a 9B model from a cold disk can take a few minutes. */
const LOAD_MS = 10 * 60_000;
const JOB_POLL_MS = 1_000;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PullProgress {
  percent: number | null;
  bytesDownloaded: number | null;
  bytesTotal: number | null;
}
export interface LemonadeModel {
  name: string;
  downloaded: boolean;
  loaded: boolean;
  labels: string[];
  sizeGb: number | null;
}
export interface LemonadeHealth {
  version: string | null;
  loaded: { model: string; context: number | null }[];
}
export interface LemonadeHardware {
  memoryGb: number | null;
  gpuName: string | null;
  vramGb: number | null;
  npu: boolean;
}

/** Trims trailing slashes and requires an http(s) URL. Throws a readable error otherwise. */
export function normaliseBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`LEMONADE_BASE_URL is not a URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("LEMONADE_BASE_URL must start with http:// or https://");
  }
  return url.toString().replace(/\/+$/, "");
}

export class LemonadeClient {
  readonly base: string;
  constructor(
    base: string = LEMONADE_DEFAULT_BASE_URL,
    private readonly apiKey: string | null = null,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.base = normaliseBaseUrl(base);
  }

  headers(json = false): Record<string, string> {
    return {
      Accept: "application/json",
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  private async request(
    path: string,
    init: RequestInit = {},
    timeoutMs = QUICK_MS,
    signal?: AbortSignal,
  ): Promise<Response> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const res = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: { ...this.headers(!!init.body), ...(init.headers as Record<string, string> | undefined) },
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    });
    if (!res.ok) {
      let detail: string;
      try {
        const body = obj(await res.json());
        detail = str(body.detail) ?? str(obj(body.error).message) ?? JSON.stringify(body).slice(0, 200);
      } catch {
        detail = res.statusText;
      }
      throw new Error(`Lemonade ${path} failed (${res.status}): ${detail}`);
    }
    return res;
  }

  /** Null when nothing (or nothing that looks like Lemonade) answers. */
  async health(): Promise<LemonadeHealth | null> {
    try {
      const body = obj(await (await this.request("/health")).json());
      const loaded = Array.isArray(body.all_models_loaded) ? body.all_models_loaded : [];
      return {
        version: str(body.version),
        loaded: loaded.map(obj).filter((m) => str(m.model_name)).map((m) => ({
          model: str(m.model_name)!,
          context: num(obj(m.recipe_options).ctx_size) ?? num(m.max_context_window),
        })),
      };
    } catch {
      return null;
    }
  }

  async models(loaded: ReadonlySet<string> = new Set()): Promise<LemonadeModel[]> {
    // show_all: without it Lemonade lists only downloaded models, and the studio could not offer the download.
    const body = obj(await (await this.request("/models?show_all=true", {}, SLOW_MS)).json());
    return (Array.isArray(body.data) ? body.data : []).map(obj).filter((m) => str(m.id)).map((m) => ({
      name: str(m.id)!,
      downloaded: m.downloaded !== false,
      loaded: loaded.has(str(m.id)!),
      labels: Array.isArray(m.labels) ? m.labels.filter((l): l is string => typeof l === "string") : [],
      sizeGb: num(m.size),
    }));
  }

  async hardware(): Promise<LemonadeHardware | null> {
    try {
      const body = obj(await (await this.request("/system-info", {}, SLOW_MS)).json());
      const devices = obj(body.devices);
      const gpus = [
        ...(Array.isArray(devices.amd_gpu) ? devices.amd_gpu : []),
        ...(Array.isArray(devices.nvidia_gpu) ? devices.nvidia_gpu : []),
      ]
        .map(obj).filter((g) => g.available === true && g.integrated !== true);
      const best = gpus.sort((a, b) => (num(b.vram_gb) ?? 0) - (num(a.vram_gb) ?? 0))[0];
      const mem = /([\d.]+)\s*GB/i.exec(str(body["Physical Memory"]) ?? "");
      return {
        memoryGb: mem ? Number(mem[1]) : null,
        gpuName: best ? str(best.name) : null,
        vramGb: best ? num(best.vram_gb) : null,
        npu: obj(devices.amd_npu).available === true,
      };
    } catch {
      return null;
    }
  }

  /**
   * Downloads a model. Lemonade owns the download as a job, which survives this request and continues a partial file next
   * time; progress comes from GET /downloads. Aborting `signal` cancels the job and keeps what was downloaded. A server
   * that answers with an event stream instead is read as a stream.
   */
  async pull(
    model: string,
    onProgress: (p: PullProgress) => void,
    signal?: AbortSignal,
    definition?: { checkpoint: string; recipe: string; labels?: string[] },
  ): Promise<void> {
    const res = await this.request(
      "/pull",
      { method: "POST", body: JSON.stringify({ model_name: model, stream: true, subscribe: false, ...definition }) },
      24 * 3_600_000,
      signal,
    );
    if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      return this.readPullStream(res, onProgress);
    }
    const id = str(obj(await res.json()).id) ?? `model:${model}`;
    for (;;) {
      if (signal?.aborted) {
        await this.cancelDownload(id).catch(() => undefined);
        throw new DOMException("The download was cancelled.", "AbortError");
      }
      const list = (await (await this.request("/downloads", {}, SLOW_MS)).json()) as unknown;
      const cur = Array.isArray(list) ? list.map(obj).find((j) => j.id === id) : undefined;
      const status = str(cur?.status) ?? "completed";
      if (status === "error") throw new Error(str(cur?.error) ?? "The download failed.");
      if (status === "cancelled") throw new DOMException("The download was cancelled.", "AbortError");
      const total = num(cur?.total_download_size);
      const done = num(cur?.cumulative_bytes_downloaded);
      if (status === "completed" || cur?.complete === true) {
        return onProgress({ percent: 100, bytesDownloaded: total, bytesTotal: total });
      }
      onProgress({
        percent: total && done !== null ? Math.min(100, (done / total) * 100) : num(cur?.percent),
        bytesDownloaded: done,
        bytesTotal: total,
      });
      await sleep(JOB_POLL_MS);
    }
  }

  async cancelDownload(id: string): Promise<void> {
    await this.request(
      "/downloads/control",
      { method: "POST", body: JSON.stringify({ id, action: "cancel" }) },
      SLOW_MS,
    );
  }

  private async readPullStream(res: Response, onProgress: (p: PullProgress) => void): Promise<void> {
    if (!res.body) throw new Error("Lemonade sent no download progress.");
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of res.body) {
      buf += dec.decode(chunk, { stream: true });
      let at: number;
      while ((at = buf.indexOf("\n\n")) >= 0) {
        const ev = parseSseEvent(buf.slice(0, at));
        buf = buf.slice(at + 2);
        if (!ev) continue;
        if (ev.name === "error") throw new Error(str(ev.data.message) ?? str(ev.data.error) ?? "The download failed.");
        if (ev.name === "complete") return;
        onProgress({
          percent: num(ev.data.percent),
          bytesDownloaded: num(ev.data.bytes_downloaded),
          bytesTotal: num(ev.data.bytes_total),
        });
      }
    }
  }

  /** Loads a model with a context size. `llamacppArgs` is optional (the speed tip lives in the server's environment instead). */
  async load(model: string, contextSize: number): Promise<void> {
    await this.request(
      "/load",
      { method: "POST", body: JSON.stringify({ model_name: model, ctx_size: contextSize }) },
      LOAD_MS,
    );
  }

  async unload(): Promise<void> {
    await this.request("/unload", { method: "POST", body: "{}" }, SLOW_MS);
  }

  /** One short chat without thinking: checks that a freshly loaded model answers sensibly. */
  async ask(model: string, prompt: string): Promise<string> {
    const res = await this.request("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model,
        max_tokens: 32,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
        chat_template_kwargs: { enable_thinking: false },
      }),
    }, LOAD_MS);
    const body = obj(await res.json());
    const choice = obj(Array.isArray(body.choices) ? body.choices[0] : null);
    return str(obj(choice.message).content) ?? "";
  }
}

/** One server-sent event: its `event:` name and parsed `data:` JSON. */
export function parseSseEvent(block: string): { name: string; data: Json } | null {
  let name = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (data.length === 0) return null;
  try {
    const parsed = obj(JSON.parse(data.join("\n")));
    return { name: name === "message" ? (str(parsed.event) ?? str(parsed.status) ?? name) : name, data: parsed };
  } catch {
    return null;
  }
}
