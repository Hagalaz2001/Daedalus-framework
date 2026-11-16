import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import {
  assess,
  chooseLocalModel,
  type Hardware,
  LOCAL_MODELS,
  localModels,
  modelSpill,
} from "../../shared/localAi.ts";
import { loadEnv, validateEnv } from "../env.ts";
import {
  collectHardware,
  hasAvx2Linux,
  parseCpuNameLinux,
  parseDf,
  parseNvidiaSmi,
  parseWindowsDisplayRegistry,
} from "../hardware.ts";
import { createLocalAi, isChatModelId, type LocalProgress } from "../localAi.ts";
import { createProviderManager } from "../providerManager.ts";
import { renderDoctor, runDoctor } from "../doctor.ts";
import { createApi } from "../api.ts";
import { fixtureDesigns } from "../providers/fixtures.ts";
import { cleanup, makeProject } from "./helpers.ts";
import { deadBaseUrl, startFakeLemonade } from "./fakeLemonade.ts";

const GB = 1024 ** 3;
const hw = (over: Partial<Hardware> = {}): Hardware => ({
  os: "linux",
  arch: "x86_64",
  cpu: "Test CPU",
  ramBytes: 32 * GB,
  availableRamBytes: 24 * GB,
  freeDiskBytes: 200 * GB,
  avx2: true,
  gpus: [],
  unifiedMemory: false,
  ryzenAi: false,
  ...over,
});
const envFor = (base: string, over: Record<string, string> = {}) =>
  loadEnv([], { LEMONADE_BASE_URL: base, OLLAMA_HOST: "http://127.0.0.1:1", ...over });

async function untilDone(read: () => LocalProgress | null, ms = 8_000): Promise<LocalProgress> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const p = read();
    if (p && ["done", "failed", "cancelled"].includes(p.stage)) return p;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`still ${read()?.stage}`);
}

Deno.test("model tiers follow the measured memory numbers", () => {
  const pick = (ramGb: number, availGb: number, gpuGb = 0) => {
    const r = chooseLocalModel({ totalBytes: ramGb * GB, availableBytes: availGb * GB, gpuBytes: gpuGb * GB });
    return r.model ? r.model.label : r.reason;
  };
  assertEquals(pick(8, 6), "close-apps", "8 GB with 6 free is not enough for the 4B model at 6.4 GB");
  assertEquals(pick(8, 7), "Qwen3.5 4B");
  assertEquals(pick(12, 9), "Qwen3.5 4B");
  assertEquals(pick(16, 12), "MiMo V2.6 9B");
  assertEquals(pick(16, 9.6), "MiMo V2.6 9B (compact)");
  assertEquals(pick(16, 7), "Qwen3.5 4B");
  assertEquals(pick(32, 20), "MiMo V2.6 9B");
  assertEquals(pick(6, 5), "low-memory");
  assertEquals(pick(8, 7, 16), "MiMo V2.6 9B", "a 16 GB GPU holds the 9B model whatever the RAM");
});

Deno.test("where a model runs: GPU, spilling into RAM, or paging from disk", () => {
  const big = LOCAL_MODELS.qwen27b;
  assertEquals(modelSpill(big, 16 * GB, 16 * GB), "gpu");
  assertEquals(modelSpill(big, 8 * GB, 32 * GB), "ram");
  assertEquals(modelSpill(big, 0, 8 * GB), "ssd");
});

Deno.test("only Apache-2.0 and MIT models are recommended, with a Hugging Face checkpoint each", () => {
  for (const m of localModels()) {
    assert(["Apache-2.0", "MIT"].includes(m.licence), m.name);
    assertStringIncludes(m.checkpoint, ".gguf");
    assert(m.name.startsWith("user."), "registered as a user model, so a stock Lemonade can pull it");
    assert(m.runBytes > m.bytes);
  }
  assertEquals(localModels().filter((m) => m.optional).map((m) => m.label), ["Qwen3.8 27B (best quality)"]);
});

Deno.test("assessment: tiers, minimum checks and Apple Silicon", () => {
  assertEquals(assess(hw()).tier, "recommended");
  assertEquals(assess(hw({ ramBytes: 16 * GB, availableRamBytes: 11 * GB })).tier, "workable");
  assertEquals(assess(hw({ ramBytes: 8 * GB, availableRamBytes: 7 * GB })).tier, "minimum");
  assertEquals(assess(hw({ ramBytes: 4 * GB, availableRamBytes: 3 * GB })).tier, "below-minimum");
  const lowDisk = assess(hw({ freeDiskBytes: 6 * GB }));
  assertEquals(lowDisk.tier, "below-minimum");
  assert(lowDisk.checks.some((c) => c.level === "fail" && c.text.includes("free disk")));
  assertEquals(assess(hw({ avx2: false })).tier, "below-minimum");
  assertEquals(assess(hw({ arch: "arm" })).tier, "below-minimum");
  const gpu = assess(
    hw({ ramBytes: 16 * GB, availableRamBytes: 12 * GB, gpus: [{ name: "GPU 16", vramBytes: 15.9 * GB }] }),
  );
  assertEquals(gpu.tier, "recommended");
  assertEquals(gpu.bestQuality, "gpu");
  assertEquals(
    assess(
      hw({
        ramBytes: 8 * GB,
        availableRamBytes: 7 * GB,
        gpus: [{ name: "Intel UHD", vramBytes: 1 * GB, integrated: true }],
      }),
    )
      .gpuBytes,
    0,
    "integrated graphics share RAM",
  );
  const mac = assess(
    hw({
      os: "darwin",
      arch: "aarch64",
      avx2: null,
      unifiedMemory: true,
      ramBytes: 16 * GB,
      availableRamBytes: 10 * GB,
    }),
  );
  assertEquals(mac.tier, "recommended");
  assert(mac.checks.some((c) => c.text.includes("Apple Silicon")));
  assert(assess(hw({ ryzenAi: true })).checks.some((c) => c.text.includes("Ryzen AI")));
  assert(assess(hw({ avx2: null })).checks.some((c) => c.level === "warn" && c.text.includes("AVX2")));
});

Deno.test("hardware parsers: nvidia-smi, the Windows display registry, df and /proc/cpuinfo", () => {
  assertEquals(parseNvidiaSmi("NVIDIA GeForce RTX 4070, 12282\n"), [{
    name: "NVIDIA GeForce RTX 4070",
    vramBytes: 12282 * 1024 * 1024,
  }]);
  assertEquals(parseNvidiaSmi("garbage"), []);
  const reg = [
    "HKEY_LOCAL_MACHINE\\SYSTEM\\...\\0000",
    "    DriverDesc    REG_SZ    AMD Radeon RX 9060 XT",
    "    HardwareInformation.qwMemorySize    REG_QWORD    0x3fc000000",
    "",
    "HKEY_LOCAL_MACHINE\\SYSTEM\\...\\0001",
    "    DriverDesc    REG_SZ    Intel(R) UHD Graphics 630",
    "    HardwareInformation.qwMemorySize    REG_QWORD    0x40000000",
    "",
  ].join("\r\n");
  const gpus = parseWindowsDisplayRegistry(reg);
  assertEquals(gpus.map((g) => [g.name, Math.round(g.vramBytes / GB * 10) / 10, !!g.integrated]), [[
    "AMD Radeon RX 9060 XT",
    15.9,
    false,
  ], [
    "Intel(R) UHD Graphics 630",
    1,
    true,
  ]]);
  assertEquals(
    parseDf("Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/x 1000 400 600 40% /home"),
    600 * 1024,
  );
  assertEquals(parseDf("nope"), null);
  assertEquals(parseCpuNameLinux("processor : 0\nmodel name : AMD Ryzen AI 9 HX 370\n"), "AMD Ryzen AI 9 HX 370");
  assertEquals(hasAvx2Linux("flags : fpu sse4_2 avx avx2 fma"), true);
  assertEquals(hasAvx2Linux("flags : fpu sse4_2 avx"), false);
  assertEquals(hasAvx2Linux("nothing"), null);
});

Deno.test("collectHardware works with every probe failing (nothing is required to exist)", async () => {
  const h = await collectHardware(() => Promise.resolve(null));
  assert(h.ramBytes > 0 && h.availableRamBytes > 0);
  assertEquals(h.gpus.filter((g) => /nvidia/i.test(g.name)).length, 0);
});

Deno.test("model ids that cannot chat are filtered", () => {
  for (const id of ["nomic-embed-text-v1", "Whisper-Large", "PaddleOCR-VL", "kokoro-v1", "SDXL-Turbo"]) {
    assertEquals(isChatModelId(id), false, id);
  }
  for (const id of ["Qwen3.5-4B-Q4_K_M", "user.MiMo-V2.6-Distill-Qwen-9B-Q4_K_M", "Socratic-7B"]) {
    assertEquals(isChatModelId(id), true, id);
  }
});

Deno.test("environment: LEMONADE_BASE_URL, auto by default, early failure for a pinned provider that cannot work", () => {
  const d = loadEnv([], {});
  assertEquals([d.provider, d.lemonadeBaseUrl, d.lemonadeModel, d.lemonadeApiKey], [
    "auto",
    "http://localhost:13305/api/v1",
    "",
    null,
  ]);
  assertEquals(
    loadEnv([], { LEMONADE_BASE_URL: "http://127.0.0.1:9/api/v1", LEMONADE_MODEL: "x", LEMONADE_API_KEY: "k" })
      .lemonadeBaseUrl,
    "http://127.0.0.1:9/api/v1",
  );
  validateEnv(d);
  try {
    validateEnv({ ...d, provider: "anthropic" });
    throw new Error("should have thrown");
  } catch (e) {
    assertStringIncludes(String((e as Error).message), "ANTHROPIC_API_KEY");
  }
  try {
    validateEnv({ ...d, provider: "nope" });
    throw new Error("should have thrown");
  } catch (e) {
    assertStringIncludes(String((e as Error).message), "Unknown STUDIO_PROVIDER");
  }
});

Deno.test("status: unreachable server reports it plainly, a running one lists chat models and flags the catalogue", async () => {
  const dead = createLocalAi({ env: envFor(await deadBaseUrl()), collect: () => Promise.resolve(hw()) });
  const s0 = await dead.status();
  assertEquals([s0.reachable, s0.models, s0.assessment.tier], [false, [], "recommended"]);
  assert(s0.catalogue.every((m) => !m.installed && !m.loaded));
  assertEquals(s0.catalogue.filter((m) => m.recommended).map((m) => m.label), ["MiMo V2.6 9B"]);

  const fake = await startFakeLemonade({
    models: [{ id: LOCAL_MODELS.qwen4b.name }, { id: "nomic-embed-text" }, { id: "other", downloaded: false }],
    loaded: [LOCAL_MODELS.qwen4b.name],
  });
  try {
    const s = await createLocalAi({ env: envFor(fake.base), collect: () => Promise.resolve(hw()) }).status();
    assertEquals([s.reachable, s.version], [true, "9.9.9-test"]);
    assertEquals(s.models.map((m) => m.name), [LOCAL_MODELS.qwen4b.name, "other"], "the embedding model is hidden");
    const q = s.catalogue.find((m) => m.name === LOCAL_MODELS.qwen4b.name)!;
    assertEquals([q.installed, q.loaded], [true, true]);
  } finally {
    await fake.close();
  }
});

Deno.test("set-up: registers, downloads with progress, loads with a 32k context, checks the answer, reports done", async () => {
  const fake = await startFakeLemonade({ pullPolls: 3 });
  try {
    const events: (LocalProgress | null)[] = [];
    const ai = createLocalAi({
      env: envFor(fake.base),
      collect: () => Promise.resolve(hw()),
      emit: (p) => events.push(p),
    });
    await ai.setUp();
    const done = await untilDone(ai.progress);
    assertEquals(done.stage, "done");
    assertEquals(done.model, LOCAL_MODELS.mimo9b.name);
    const stages = events.map((e) => e?.stage);
    assert(stages.includes("downloading") && stages.includes("loading") && stages.includes("checking"));
    assert(
      events.some((e) => e?.stage === "downloading" && (e.percent ?? 0) > 0 && (e.percent ?? 0) < 100),
      "intermediate progress",
    );
    const pull = fake.requests.find((r) => r.path === "/pull")!.body!;
    assertEquals(pull.model_name, LOCAL_MODELS.mimo9b.name);
    assertEquals(pull.checkpoint, LOCAL_MODELS.mimo9b.checkpoint);
    const load = fake.requests.find((r) => r.path === "/load")!.body!;
    assertEquals(load, { model_name: LOCAL_MODELS.mimo9b.name, ctx_size: 32768 });
    assertEquals(fake.loaded, [LOCAL_MODELS.mimo9b.name]);
    assertEquals(await ai.activeModel(), LOCAL_MODELS.mimo9b.name, "the loaded model becomes the chat model");
  } finally {
    await fake.close();
  }
});

Deno.test("set-up: an installed model is loaded without downloading again", async () => {
  const fake = await startFakeLemonade({ models: [{ id: LOCAL_MODELS.qwen4b.name }] });
  try {
    const ai = createLocalAi({ env: envFor(fake.base), collect: () => Promise.resolve(hw()) });
    await ai.setUp(LOCAL_MODELS.qwen4b.name);
    assertEquals((await untilDone(ai.progress)).stage, "done");
    assert(!fake.requests.some((r) => r.path === "/pull"));
  } finally {
    await fake.close();
  }
});

Deno.test("set-up: not enough disk space stops before any download", async () => {
  const fake = await startFakeLemonade();
  try {
    const ai = createLocalAi({ env: envFor(fake.base), collect: () => Promise.resolve(hw({ freeDiskBytes: 3 * GB })) });
    await ai.setUp();
    const p = await untilDone(ai.progress);
    assertEquals(p.stage, "failed");
    assertStringIncludes(p.error!, "Not enough free disk space");
    assert(!fake.requests.some((r) => r.path === "/pull"));
  } finally {
    await fake.close();
  }
});

Deno.test("set-up: a model that loads but answers nonsense is reported, not accepted", async () => {
  const fake = await startFakeLemonade({ sanity: "banana" });
  try {
    const ai = createLocalAi({ env: envFor(fake.base), collect: () => Promise.resolve(hw()) });
    await ai.setUp();
    const p = await untilDone(ai.progress);
    assertEquals(p.stage, "failed");
    assertStringIncludes(p.error!, "answered");
  } finally {
    await fake.close();
  }
});

Deno.test("set-up: cancel stops the download, a second set-up while running is refused, no server means a clear error", async () => {
  const fake = await startFakeLemonade({ pullPolls: 1000 });
  try {
    const ai = createLocalAi({ env: envFor(fake.base), collect: () => Promise.resolve(hw()) });
    await ai.setUp();
    let refused = "";
    await ai.setUp().catch((e) => (refused = e.message));
    assertStringIncludes(refused, "already being set up");
    await new Promise((r) => setTimeout(r, 1300));
    ai.cancel();
    assertEquals((await untilDone(ai.progress)).stage, "cancelled");
    assertEquals(fake.cancelled.length, 1);
  } finally {
    await fake.close();
  }
  const none = createLocalAi({ env: envFor(await deadBaseUrl()), collect: () => Promise.resolve(hw()) });
  let msg = "";
  await none.setUp().catch((e) => (msg = e.message));
  assertStringIncludes(msg, "lemonade-server.ai");
  const small = createLocalAi({
    env: envFor(fake.base),
    collect: () => Promise.resolve(hw({ ramBytes: 4 * GB, availableRamBytes: 3 * GB })),
  });
  await small.setUp().then(() => assert(false), (e) => assertStringIncludes(e.message, "too little memory"));
});

Deno.test("auto provider order: no AI -> demo fixtures with a banner; Lemonade; Ollama; a cloud key wins without probing local servers", async () => {
  const dead = await deadBaseUrl();
  const mk = (env: ReturnType<typeof envFor>, ollama: string[] | null) => {
    const localAi = createLocalAi({ env, collect: () => Promise.resolve(hw()) });
    return createProviderManager({ env, localAi, ollamaModels: () => Promise.resolve(ollama) });
  };
  const none = await mk(envFor(dead), null).describe();
  assertEquals([none.active, none.banner], ["fake", "no-ai"]);
  assertStringIncludes(none.options.find((o) => o.id === "lemonade")!.detail, "Not running");

  const ollama = await mk(envFor(dead), ["qwen3-coder:latest"]).describe();
  assertEquals([ollama.active, ollama.banner], ["ollama", null]);

  const fake = await startFakeLemonade({ loaded: ["user.M"] });
  try {
    const both = await mk(envFor(fake.base), ["qwen3-coder"]).describe();
    assertEquals(both.active, "lemonade", "Lemonade before Ollama");
    assertStringIncludes(both.options.find((o) => o.id === "lemonade")!.detail, "Ready: user.M");

    const before = fake.requests.length;
    const cloud = await mk(envFor(fake.base, { ANTHROPIC_API_KEY: "sk-test" }), ["qwen3-coder"]).describe();
    assertEquals(cloud.active, "anthropic");
    assertEquals(fake.requests.length, before, "a cloud key means local servers are not even asked");

    const idle = await startFakeLemonade({ loaded: [] });
    try {
      const noModel = await mk(envFor(idle.base), null).describe();
      assertEquals(noModel.active, "fake");
      assertStringIncludes(noModel.options.find((o) => o.id === "lemonade")!.detail, "no chat model is loaded");
    } finally {
      await idle.close();
    }
  } finally {
    await fake.close();
  }
});

Deno.test("pinning a provider overrides auto, and a pinned but unavailable one fails with the reason", async () => {
  const dead = await deadBaseUrl();
  const env = envFor(dead);
  const m = createProviderManager({
    env,
    localAi: createLocalAi({ env, collect: () => Promise.resolve(hw()) }),
    ollamaModels: () => Promise.resolve(null),
  });
  m.select("lemonade");
  const s = await m.describe();
  assertEquals([s.selected, s.active, s.banner], ["lemonade", "lemonade", null]);
  let msg = "";
  await m.provider.call({ system: [], user: "x", tool: { name: "t", description: "", schema: {} } }).catch((
    e,
  ) => (msg = e.message));
  assertStringIncludes(msg, "Local AI (Lemonade) is not available");
  m.select("auto");
  assertEquals((await m.describe()).active, "fake");
  try {
    m.select("nope" as never);
    throw new Error("should have thrown");
  } catch (e) {
    assertStringIncludes(String((e as Error).message), "Unknown provider");
  }
});

Deno.test("the doctor report names the tier, the model and the Lemonade state, and fails below the minimum", async () => {
  const text = renderDoctor({
    hardware: hw(),
    assessment: assess(hw()),
    lemonade: { base: "http://x/api/v1", running: false, version: null, loadedModel: null },
  });
  for (
    const part of [
      "Daedalus doctor",
      "Recommended",
      "MiMo V2.6 9B (MIT)",
      "not running at http://x/api/v1",
      "lemonade-server.ai",
      "docs/LOCAL-AI.md",
    ]
  ) assertStringIncludes(text, part);
  const low = renderDoctor({
    hardware: hw({ ramBytes: 4 * GB }),
    assessment: assess(hw({ ramBytes: 4 * GB, availableRamBytes: 3 * GB })),
    lemonade: null,
  });
  assertStringIncludes(low, "Below the minimum");
  assertStringIncludes(low, "not checked");
  const fake = await startFakeLemonade({ loaded: ["user.M"] });
  try {
    const { report, text: out, code } = await runDoctor(["--lemonade-url", fake.base, "--json"], {});
    assertEquals(report.lemonade, { base: fake.base, running: true, version: "9.9.9-test", loadedModel: "user.M" });
    assertEquals(JSON.parse(out).lemonade.running, true);
    assert(code === 0 || code === 1);
  } finally {
    await fake.close();
  }
});

Deno.test("API: provider state, local AI status and set-up over HTTP, and a design generated through the local model lands in the project", async () => {
  const root = makeProject();
  const html = (file: string) =>
    fixtureDesigns(
      "sales dashboard",
      [file],
      ":root{--color-primary:#2a4bd7;--color-on-primary:#fff;--color-surface:#fff;--color-surface-muted:#f5f6f8;--color-text:#0e1116;--color-text-muted:#525a66;--color-border:#e1e4ea;--color-success:#17743d;--color-warning:#a15c07;--color-danger:#b42318}",
    )[0]!.html;
  const fake = await startFakeLemonade({
    loaded: ["user.M"],
    models: [{ id: "user.M" }],
    answers: [(body) => {
      const user = String((body.messages as { content: unknown }[])[1]!.content);
      const file = /Return exactly these files: ([a-z0-9-]+\.html)/.exec(user)?.[1] ?? "v1.html";
      return JSON.stringify({ files: [{ file, html: html(file) }] });
    }],
  });
  const PORT = 4398;
  const HOST = `127.0.0.1:${PORT}`;
  try {
    const env = envFor(fake.base);
    const api = createApi({ root, env, uiDir: null, collectHardware: () => Promise.resolve(hw()) });
    const call = (path: string, body?: unknown) =>
      api.handle(
        new Request(`http://${HOST}${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: { host: HOST, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        PORT,
      );

    const state = await (await call("/api/providers")).json();
    assertEquals([state.active, state.banner, state.options.map((o: { id: string }) => o.id)], ["lemonade", null, [
      "anthropic",
      "lemonade",
      "ollama",
      "fake",
    ]]);
    const status = await (await call("/api/local-ai/status")).json();
    assertEquals([status.reachable, status.loaded[0].model, status.assessment.tier], [true, "user.M", "recommended"]);

    const begun = await (await call("/api/design", {
      command: {
        kind: "begin",
        step: "generate",
        name: "Overview",
        brief: "Sales dashboard",
        target: "web-desktop",
        count: 2,
      },
    })).json();
    await api.jobs.idle();
    const list = await (await call("/api/design", { command: { kind: "list" } })).json();
    assertEquals(list.screens[0].files.map((f: { file: string; ok: boolean }) => [f.file, f.ok]), [["v1.html", true], [
      "v2.html",
      true,
    ]]);
    assertEquals(list.jobs[`${begun.slug}/${begun.step.id}`].state, "done");
    assert(Deno.readTextFileSync(join(root, "design", begun.slug, "v1.html")).includes("Overview"));
    assertEquals(fake.requests.filter((r) => r.path === "/chat/completions").length, 2, "one local call per variant");

    assertEquals((await call("/api/local-ai/setup", { model: "nope" })).status, 400);
    assertEquals((await (await call("/api/provider", { id: "fake" })).json()).active, "fake");
    assertEquals((await (await call("/api/provider", { id: "auto" })).json()).active, "lemonade");
  } finally {
    await fake.close();
    cleanup(root);
  }
});

Deno.test("a Lemonade server on another machine is flagged as not private", async () => {
  const env = envFor("http://192.168.1.50:13305/api/v1");
  const m = createProviderManager({
    env,
    localAi: createLocalAi({
      env,
      collect: () => Promise.resolve(hw()),
      fetchImpl: () => Promise.reject(new Error("offline")),
    }),
    ollamaModels: () => Promise.resolve(null),
  });
  assertStringIncludes((await m.describe()).options.find((o) => o.id === "lemonade")!.note!, "Not on this computer");
});
