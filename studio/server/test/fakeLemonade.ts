// A fake Lemonade Server on a random free port, for tests. It never touches the real default port (13305) or any port
// the developer machine uses for other tools: the port is chosen by the OS and re-rolled if it lands in a reserved range.
export interface FakeLemonadeOptions {
  /** Models the fake lists. */
  models?: { id: string; downloaded?: boolean; labels?: string[] }[];
  /** Models already loaded. */
  loaded?: string[];
  /** Answers for /chat/completions (non-sanity), consumed in order; the last one repeats. Receives the parsed request body. */
  answers?: (string | ((body: Record<string, unknown>) => string))[];
  /** Reject requests that carry response_format (a server without JSON-schema support). */
  rejectSchema?: boolean;
  /** What the sanity question ("17*3") gets answered. */
  sanity?: string;
  /** How many /downloads polls a pull needs before it completes. */
  pullPolls?: number;
  /** Answer the pull with a server-sent-event stream instead of a job. */
  pullAsStream?: boolean;
  system?: Record<string, unknown>;
  /** If set, every request needs this bearer token. */
  apiKey?: string;
}

export interface FakeLemonade {
  base: string;
  port: number;
  requests: { method: string; path: string; body: Record<string, unknown> | null }[];
  loaded: string[];
  models: { id: string; downloaded: boolean; labels: string[] }[];
  cancelled: string[];
  close(): Promise<void>;
}

const RESERVED = (p: number) =>
  [13305, 11434, 9333, 1420, 9344, 3417, 5197, 9491, 9509, 9519].includes(p) || (p >= 41800 && p <= 41999);

export async function startFakeLemonade(opts: FakeLemonadeOptions = {}): Promise<FakeLemonade> {
  const requests: FakeLemonade["requests"] = [];
  const state = {
    loaded: [...(opts.loaded ?? [])],
    models: (opts.models ?? []).map((m) => ({ id: m.id, downloaded: m.downloaded ?? true, labels: m.labels ?? [] })),
    cancelled: [] as string[],
    polls: 0,
    answerIndex: 0,
    job: null as string | null,
  };
  const json = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });

  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const body = req.method === "POST"
      ? ((await req.json().catch(() => null)) as Record<string, unknown> | null)
      : null;
    requests.push({ method: req.method, path, body });
    if (opts.apiKey && req.headers.get("authorization") !== `Bearer ${opts.apiKey}`) {
      return json({ error: { message: "unauthorized" } }, 401);
    }

    if (path === "/health") {
      return json({
        status: "ok",
        version: "9.9.9-test",
        all_models_loaded: state.loaded.map((m) => ({ model_name: m, recipe_options: { ctx_size: 32768 } })),
      });
    }
    if (path === "/models") {
      return json({
        data: state.models.map((m) => ({ id: m.id, downloaded: m.downloaded, labels: m.labels, size: 5.4 })),
      });
    }
    if (path === "/system-info") {
      return json(
        opts.system ??
          {
            "Physical Memory": "32.0 GB",
            devices: { amd_gpu: [{ name: "Test GPU", available: true, vram_gb: 16 }], amd_npu: { available: false } },
          },
      );
    }
    if (path === "/pull") {
      const name = String(body?.model_name);
      state.polls = 0;
      state.job = `model:${name}`;
      if (opts.pullAsStream) {
        const events = [
          `event: progress\ndata: {"percent":40,"bytes_downloaded":4,"bytes_total":10}\n\n`,
          `event: complete\ndata: {}\n\n`,
        ];
        if (!state.models.some((m) => m.id === name)) {
          state.models.push({ id: name, downloaded: true, labels: ["custom"] });
        }
        return new Response(events.join(""), { headers: { "content-type": "text/event-stream" } });
      }
      return json({ id: state.job });
    }
    if (path === "/downloads") {
      state.polls++;
      const need = opts.pullPolls ?? 2;
      if (state.cancelled.includes(state.job ?? "")) return json([{ id: state.job, status: "cancelled" }]);
      if (state.polls >= need) {
        const name = String(state.job).replace(/^model:/, "");
        const have = state.models.find((m) => m.id === name);
        if (have) have.downloaded = true;
        else state.models.push({ id: name, downloaded: true, labels: ["custom"] });
        return json([{ id: state.job, status: "completed", complete: true, total_download_size: 1000 }]);
      }
      return json([{
        id: state.job,
        status: "running",
        total_download_size: 1000,
        cumulative_bytes_downloaded: Math.round((state.polls / need) * 1000),
      }]);
    }
    if (path === "/downloads/control") {
      state.cancelled.push(String(body?.id));
      return json({ ok: true });
    }
    if (path === "/load") {
      state.loaded = [String(body?.model_name)];
      return json({ status: "loaded" });
    }
    if (path === "/unload") {
      state.loaded = [];
      return json({ status: "unloaded" });
    }
    if (path === "/chat/completions" && body) {
      if (body.max_tokens === 32) return json({ choices: [{ message: { content: opts.sanity ?? "51" } }] });
      if (opts.rejectSchema && "response_format" in body) {
        return json({ error: { message: "response_format is not supported" } }, 400);
      }
      const list = opts.answers ?? ["{}"];
      const pick = list[Math.min(state.answerIndex++, list.length - 1)]!;
      const text = typeof pick === "function" ? pick(body) : pick;
      const enc = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          // Several small deltas, like a real stream, plus a keep-alive comment and the [DONE] marker.
          for (let i = 0; i < text.length; i += 64) {
            c.enqueue(
              enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 64) } }] })}\n\n`),
            );
          }
          c.enqueue(enc.encode(": keep-alive\n\ndata: [DONE]\n\n"));
          c.close();
        },
      });
      return new Response(stream, { headers: { "content-type": "text/event-stream" } });
    }
    return json({ error: { message: `no route ${path}` } }, 404);
  };

  for (;;) {
    const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen: () => {} }, handler);
    const port = server.addr.port;
    if (RESERVED(port)) {
      await server.shutdown();
      continue;
    }
    return {
      base: `http://127.0.0.1:${port}/api/v1`,
      port,
      requests,
      get loaded() {
        return state.loaded;
      },
      get models() {
        return state.models;
      },
      cancelled: state.cancelled,
      close: () => server.shutdown(),
    };
  }
}

/** A base URL where nothing listens: a port that was just free and is closed again. */
export async function deadBaseUrl(): Promise<string> {
  const fake = await startFakeLemonade();
  const base = fake.base;
  await fake.close();
  return base;
}
