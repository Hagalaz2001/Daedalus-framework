// HTTP surface of the studio. Local only: it binds to 127.0.0.1, refuses foreign Host/Origin headers (DNS rebinding,
// cross-site posts) and never reads or writes outside the project. File writes happen only in /api/apply, for a plan
// the developer has seen as a diff.
import { extname, join, normalize } from "node:path";
import { type ProjectContext, readContext } from "./context.ts";
import { createDesignHandler } from "./design/projectDesignHandler.ts";
import { guardedAssetDownload, loadStitchSdk } from "./design/projectDesignStitch.ts";
import { createPlans, exportInfoOf, type PlannedFile, runCheck } from "./export.ts";
import { type ExportRequest, prepareExport } from "./exportFlow.ts";
import { createJobs, type StudioEvent } from "./jobs.ts";
import type { Hardware } from "../shared/localAi.ts";
import { createLocalAi } from "./localAi.ts";
import { createProviderManager } from "./providerManager.ts";
import { readFlow, writeFlow } from "./flow.ts";
import type { StudioEnv } from "./env.ts";
import type { Provider } from "./providers/types.ts";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export interface ApiOptions {
  root: string;
  env: StudioEnv;
  /** A fixed provider (tests, embedding). Omit it to use the automatic provider manager. */
  provider?: Provider;
  /** Test hooks: fetch used for Lemonade/Ollama probes and the hardware probe. */
  fetchImpl?: typeof fetch;
  collectHardware?: () => Promise<Hardware>;
  /** Built UI folder; when missing the server answers API calls only. */
  uiDir: string | null;
  stitchLoader?: typeof loadStitchSdk;
}

export function createApi(opts: ApiOptions) {
  const { root, env } = opts;
  const freshCtx = (): ProjectContext => readContext(root);
  const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const enc = new TextEncoder();
  const bus = {
    emit(event: StudioEvent) {
      const chunk = enc.encode(`data: ${JSON.stringify(event)}\n\n`);
      for (const c of subscribers) {
        try {
          c.enqueue(chunk);
        } catch {
          subscribers.delete(c);
        }
      }
    },
  };
  const localAi = createLocalAi({
    env,
    fetchImpl: opts.fetchImpl,
    collect: opts.collectHardware,
    emit: (progress) => bus.emit({ type: "local-ai", progress }),
  });
  const manager = opts.provider ? null : createProviderManager({ env, localAi, fetchImpl: opts.fetchImpl });
  const provider: Provider = opts.provider ?? manager!.provider;
  const providerState = async () =>
    manager ? manager.describe() : {
      selected: provider.id,
      active: provider.id,
      banner: null,
      options: [{
        id: provider.id,
        label: provider.label,
        available: true,
        detail: "Fixed by the host.",
        note: provider.note ?? null,
      }],
    };
  const jobs = createJobs({ ctx: freshCtx, provider, bus });
  const handler = createDesignHandler({
    root,
    stitchKey: env.stitchKey,
    stitch: { loadSdk: opts.stitchLoader ?? loadStitchSdk, download: guardedAssetDownload },
    onBegun: (e) => {
      if (e.kind === "directions") void jobs.runDirections(root);
      else void jobs.runStep(root, e.slug, e.stepId);
    },
  });
  const plans = createPlans(freshCtx, root);

  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  const fail = (e: unknown, status = 400) => json({ error: e instanceof Error ? e.message : String(e) }, status);

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (path === "/api/events") {
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          subscribers.add(c);
          c.enqueue(enc.encode(": connected\n\n"));
        },
        cancel() {
          subscribers.delete(controller);
        },
      });
      return new Response(stream, {
        headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" },
      });
    }
    if (path === "/api/config" && req.method === "GET") {
      const c = freshCtx();
      return json({
        name: c.name,
        provider: { id: provider.id, label: provider.label, note: provider.note ?? null },
        stitch: env.stitchKey !== null,
        hasTokens: c.tokens !== null,
        hasDesignMd: c.designMd !== null,
        tokens: c.tokens,
        presets: c.presets.map((p) => ({ id: p.id, name: p.name, description: p.description, tokens: p.tokens })),
        apps: c.apps.map((a) => ({ ...a, exportLabel: exportInfoOf(a.stack)?.label ?? null })),
        kit: c.kitDocs !== null,
      });
    }
    if (path === "/api/flow" && req.method === "GET") return json(await readFlow(root));
    if (path === "/api/providers" && req.method === "GET") return json(await providerState());
    if (path === "/api/local-ai/status" && req.method === "GET") return json(await localAi.status());
    if (req.method !== "POST") return fail("Not found", 404);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail("Send a JSON body.");
    try {
      switch (path) {
        case "/api/design": {
          const result = await handler(body.command);
          const cmd = (body.command as { kind?: string } | null)?.kind;
          return json(cmd === "list" ? { ...(result as object), jobs: jobs.all() } : result ?? null);
        }
        case "/api/plan":
          return json(await plans.plan(body.files as PlannedFile[]));
        case "/api/apply": {
          const result = await plans.apply(String(body.planId));
          freshCtx();
          return json(result);
        }
        case "/api/export/prepare": {
          const prepared = await prepareExport({ ctx: freshCtx(), provider, root }, body as unknown as ExportRequest);
          const plan = prepared.files.length ? await plans.plan(prepared.files) : null;
          return json({ ...prepared, files: undefined, plan });
        }
        case "/api/flow":
          return json(await writeFlow(root, body));
        case "/api/provider":
          if (!manager) throw new Error("The provider is fixed by the host.");
          manager.select(body.id as never);
          return json(await providerState());
        case "/api/local-ai/setup":
          await localAi.setUp(typeof body.model === "string" ? body.model : undefined);
          manager?.invalidate();
          return json({ started: true });
        case "/api/local-ai/cancel":
          localAi.cancel();
          return json({ ok: true });
        case "/api/local-ai/unload":
          await localAi.unload();
          manager?.invalidate();
          return json({ ok: true });
        case "/api/check":
          return json(await runCheck(root));
        default:
          return fail("Not found", 404);
      }
    } catch (e) {
      return fail(e);
    }
  }

  async function serveUi(req: Request): Promise<Response> {
    if (!opts.uiDir) return new Response("The studio UI is not built. Run: deno task studio:build", { status: 503 });
    const rel = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^([/\\])+/, "");
    if (rel.split(/[/\\]/).includes("..")) return new Response("Not found", { status: 404 });
    for (const candidate of [rel === "" ? "index.html" : rel, "index.html"]) {
      try {
        const file = await Deno.readFile(join(opts.uiDir, candidate));
        return new Response(file, {
          headers: {
            "content-type": MIME[extname(candidate)] ?? "application/octet-stream",
            "cache-control": candidate === "index.html" ? "no-store" : "public, max-age=3600",
          },
        });
      } catch {
        // try the SPA fallback
      }
    }
    return new Response("Not found", { status: 404 });
  }

  return {
    async handle(req: Request, port: number): Promise<Response> {
      const host = req.headers.get("host") ?? "";
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
        return new Response("Forbidden host", { status: 403 });
      }
      const origin = req.headers.get("origin");
      if (req.method === "POST" && origin !== null && origin !== `http://${host}`) {
        return new Response("Forbidden origin", { status: 403 });
      }
      return new URL(req.url).pathname.startsWith("/api/") ? route(req) : serveUi(req);
    },
    jobs,
    bus,
    ctx: freshCtx,
  };
}
