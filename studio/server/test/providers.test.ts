import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import type Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "../env.ts";
import { createAnthropicProvider } from "../providers/anthropic.ts";
import { createFakeProvider } from "../providers/fake.ts";
import { createProvider } from "../providers/index.ts";
import { createOllamaProvider } from "../providers/ollama.ts";
import type { CallInput } from "../providers/types.ts";
import { DESIGN_TOOL } from "../prompts.ts";

const input = (over: Partial<CallInput> = {}): CallInput => ({
  system: [{ text: "rules", cache: true }, { text: "volatile" }],
  user: "Design it",
  tool: DESIGN_TOOL,
  ...over,
});

function fakeClient(message: unknown, deltas: string[] = []) {
  const seen: { params?: Record<string, unknown> } = {};
  const client = {
    messages: {
      stream(params: Record<string, unknown>) {
        seen.params = params;
        const handlers: Record<string, (d: string) => void> = {};
        return {
          on: (event: string, cb: (d: string) => void) => void (handlers[event] = cb),
          finalMessage: () => {
            for (const d of deltas) handlers["inputJson"]?.(d);
            return Promise.resolve(message);
          },
        };
      },
    },
  } as unknown as Anthropic;
  return { client, seen };
}

Deno.test("anthropic: claude-opus-5-5, adaptive thinking, streaming tool use, cached system blocks, no sampling params", async () => {
  const { client, seen } = fakeClient({
    stop_reason: "tool_use",
    content: [{ type: "text", text: "ok" }, {
      type: "tool_use",
      name: "write_designs",
      input: { files: [{ file: "v1.html", html: "<p/>" }] },
    }],
  }, ['{"files":', '[{"file":"v1.html"']);
  const partials: string[] = [];
  const out = await createAnthropicProvider("sk-test", "claude-opus-5-5", client).call(input({ onPartial: (p) => partials.push(p) }));
  assertEquals(out, { files: [{ file: "v1.html", html: "<p/>" }] });
  const p = seen.params!;
  assertEquals(p.model, "claude-opus-5-5");
  assertEquals(p.thinking, { type: "adaptive" });
  assertEquals(p.tool_choice, { type: "auto" });
  assert(!("temperature" in p) && !("top_p" in p) && !("budget_tokens" in p));
  const system = p.system as { text: string; cache_control?: unknown }[];
  assertEquals(system[0]!.cache_control, { type: "ephemeral" });
  assertEquals(system[1]!.cache_control, undefined);
  const tool = (p.tools as Record<string, unknown>[])[0]!;
  assertEquals(tool.name, "write_designs");
  assertEquals(tool.eager_input_streaming, true);
  assertEquals(partials, ['{"files":', '{"files":[{"file":"v1.html"']);
});

Deno.test("anthropic: a reference image is sent as an image block before the text", async () => {
  const { client, seen } = fakeClient({
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name: "write_designs", input: { files: [] } }],
  });
  await createAnthropicProvider("k", "claude-opus-5-5", client).call(input({ image: { mime: "image/png", base64: "AAAA" } }));
  const content = ((seen.params!.messages as { content: { type: string }[] }[])[0]!).content;
  assertEquals(content.map((b) => b.type), ["image", "text"]);
});

Deno.test("anthropic: refusals, truncation and a missing tool call become readable errors", async () => {
  const run = (message: unknown) => createAnthropicProvider("k", "m", fakeClient(message).client).call(input());
  await assertRejects(() => run({ stop_reason: "refusal", content: [] }), Error, "declined");
  await assertRejects(() => run({ stop_reason: "max_tokens", content: [] }), Error, "cut off");
  await assertRejects(() => run({ stop_reason: "end_turn", content: [{ type: "text", text: "hi" }] }), Error, "without calling");
});

Deno.test("ollama: native /api/chat with the schema as format, streamed NDJSON, labelled lower quality", async () => {
  let body: Record<string, unknown> = {};
  const lines = ['{"message":{"content":"{\\"files\\":["}}', '{"message":{"content":"]}"}}'].map((l) => l + "\n").join("");
  const fakeFetch = ((url: string, init: RequestInit) => {
    assertEquals(url, "http://127.0.0.1:11434/api/chat");
    body = JSON.parse(String(init.body));
    return Promise.resolve(new Response(lines));
  }) as unknown as typeof fetch;
  const provider = createOllamaProvider("http://127.0.0.1:11434/", "qwen3-coder", fakeFetch);
  assert(provider.note?.includes("lower quality"));
  const partials: string[] = [];
  assertEquals(await provider.call(input({ onPartial: (p) => partials.push(p) })), { files: [] });
  assertEquals(body.model, "qwen3-coder");
  assertEquals(body.format, DESIGN_TOOL.schema);
  assertEquals(partials.at(-1), '{"files":[]}');
});

Deno.test("ollama: unreachable server and invalid JSON give actionable messages", async () => {
  const down = createOllamaProvider(
    "http://127.0.0.1:1",
    "m",
    (() => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch,
  );
  await assertRejects(() => down.call(input()), Error, "ollama serve");
  const junk = createOllamaProvider(
    "http://h",
    "m",
    (() => Promise.resolve(new Response('{"message":{"content":"not json"}}\n'))) as unknown as typeof fetch,
  );
  await assertRejects(() => junk.call(input()), Error, "valid JSON");
  const missing = createOllamaProvider(
    "http://h",
    "m",
    (() => Promise.resolve(new Response("nope", { status: 404 }))) as unknown as typeof fetch,
  );
  await assertRejects(() => missing.call(input()), Error, "pulled");
});

Deno.test("fake provider: deterministic, streams in chunks, honours abort", async () => {
  const fake = createFakeProvider(0);
  const prompt = input({
    user: "Design variant 1 of 1 of one screen. Brief:\n<<<BRIEF-aa\nsales dashboard\nBRIEF-aa>>>\n\nReturn exactly these files: v1.html.",
  });
  const chunks: number[] = [];
  const a = await fake.call({ ...prompt, onPartial: (p) => chunks.push(p.length) });
  const b = await fake.call(prompt);
  assertEquals(a, b);
  assert(chunks.length > 3 && chunks.every((n, i) => i === 0 || n > chunks[i - 1]!), "growing partial output");
  const ac = new AbortController();
  ac.abort();
  await assertRejects(() => fake.call({ ...prompt, signal: ac.signal }));
  await assertRejects(() => fake.call({ ...prompt, tool: { ...DESIGN_TOOL, name: "other" } }), Error, "does not know");
});

Deno.test("provider selection and environment: key from env or .env, anthropic by default when a key exists, never a silent fallback", () => {
  const dir = Deno.makeTempDirSync();
  try {
    const dotenv = `${dir}/.env`;
    Deno.writeTextFileSync(dotenv, "ANTHROPIC_API_KEY=sk-from-file\nOLLAMA_MODEL=llama3\n# comment\n");
    const withKey = loadEnv([dotenv], {});
    assertEquals([withKey.provider, withKey.anthropicKey, withKey.anthropicModel, withKey.ollamaModel], [
      "anthropic",
      "sk-from-file",
      "claude-opus-5-5",
      "llama3",
    ]);
    assertEquals(loadEnv([dotenv], { ANTHROPIC_API_KEY: "sk-env" }).anthropicKey, "sk-env", "real environment wins over .env");
    const none = loadEnv([`${dir}/missing.env`], {});
    assertEquals([none.provider, none.anthropicKey, none.port], ["ollama", null, 4310]);
    assertThrows(() => createProvider({ ...none, provider: "anthropic" }), Error, "ANTHROPIC_API_KEY");
    assertThrows(() => createProvider({ ...none, provider: "nope" }), Error, "Unknown STUDIO_PROVIDER");
    assertEquals(createProvider({ ...none, provider: "fake" }).id, "fake");
    assertEquals(createProvider({ ...none, provider: "ollama" }).id, "ollama");
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});
