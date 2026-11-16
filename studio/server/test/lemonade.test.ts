import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import { extractJson, validateJson } from "../../shared/jsonSchema.ts";
import { LemonadeClient, normaliseBaseUrl, parseSseEvent } from "../lemonade.ts";
import { createLemonadeProvider } from "../providers/lemonade.ts";
import { DESIGN_TOOL, PATCH_TOOL } from "../prompts.ts";
import type { CallInput } from "../providers/types.ts";
import { deadBaseUrl, startFakeLemonade } from "./fakeLemonade.ts";

const input = (over: Partial<CallInput> = {}): CallInput => ({
  system: [{ text: "rules" }],
  user: "Design it",
  tool: DESIGN_TOOL,
  ...over,
});
const GOOD = JSON.stringify({ files: [{ file: "v1.html", html: "<p>hi</p>" }] });

Deno.test("the fake server never listens on a reserved port", async () => {
  const fake = await startFakeLemonade();
  try {
    assert(![13305, 11434, 9333, 1420, 9344, 3417, 5197, 9491, 9509, 9519].includes(fake.port));
    assert(!(fake.port >= 41800 && fake.port <= 41999));
    assertStringIncludes(fake.base, "127.0.0.1");
  } finally {
    await fake.close();
  }
});

Deno.test("base URL: trailing slashes trimmed, non-http refused, the default is Lemonade's own", () => {
  assertEquals(normaliseBaseUrl("http://localhost:13305/api/v1/"), "http://localhost:13305/api/v1");
  assertThrows(() => normaliseBaseUrl("file:///etc/passwd"), Error, "http");
  assertThrows(() => normaliseBaseUrl("not a url"), Error, "not a URL");
});

Deno.test("client: health, models (with loaded flags) and hardware come from the server's own API", async () => {
  const fake = await startFakeLemonade({
    models: [{ id: "m1", labels: ["tool-calling"] }, { id: "m2", downloaded: false }],
    loaded: ["m1"],
  });
  try {
    const c = new LemonadeClient(fake.base);
    const health = await c.health();
    assertEquals(health, { version: "9.9.9-test", loaded: [{ model: "m1", context: 32768 }] });
    const models = await c.models(new Set(["m1"]));
    assertEquals(models.map((m) => [m.name, m.downloaded, m.loaded]), [["m1", true, true], ["m2", false, false]]);
    assertEquals(await c.hardware(), { memoryGb: 32, gpuName: "Test GPU", vramGb: 16, npu: false });
    assert(fake.requests.some((r) => r.path === "/models" && r.method === "GET"));
  } finally {
    await fake.close();
  }
});

Deno.test("client: nothing listening is null, not an exception; an API key is sent as a bearer token", async () => {
  assertEquals(await new LemonadeClient(await deadBaseUrl()).health(), null);
  const fake = await startFakeLemonade({ apiKey: "secret-key" });
  try {
    assertEquals(await new LemonadeClient(fake.base).health(), null, "without the key the server says 401");
    assertEquals((await new LemonadeClient(fake.base, "secret-key").health())?.version, "9.9.9-test");
  } finally {
    await fake.close();
  }
});

Deno.test("client: a pull runs as a server job and reports progress until it completes", async () => {
  const fake = await startFakeLemonade({ pullPolls: 3 });
  try {
    const seen: (number | null)[] = [];
    await new LemonadeClient(fake.base).pull("user.X", (p) => seen.push(p.percent), undefined, {
      checkpoint: "org/repo:file.gguf",
      recipe: "llamacpp",
    });
    assertEquals(seen.at(-1), 100);
    assert(seen.length >= 2 && seen[0]! < 100);
    const pull = fake.requests.find((r) => r.path === "/pull")!;
    assertEquals(pull.body?.checkpoint, "org/repo:file.gguf");
    assertEquals(pull.body?.recipe, "llamacpp");
  } finally {
    await fake.close();
  }
});

Deno.test("client: aborting a pull cancels the server job and keeps the partial download", async () => {
  const fake = await startFakeLemonade({ pullPolls: 1000 });
  try {
    const ctl = new AbortController();
    const p = new LemonadeClient(fake.base).pull("user.X", () => ctl.abort(), ctl.signal);
    await assertRejects(() => p, DOMException);
    assertEquals(fake.cancelled, ["model:user.X"]);
  } finally {
    await fake.close();
  }
});

Deno.test("client: a server that streams pull progress as events is understood too", async () => {
  const fake = await startFakeLemonade({ pullAsStream: true });
  try {
    const seen: (number | null)[] = [];
    await new LemonadeClient(fake.base).pull("user.S", (p) => seen.push(p.percent));
    assertEquals(seen, [40]);
    assertEquals(parseSseEvent("event: complete\ndata: {}")?.name, "complete");
    assertEquals(parseSseEvent("event: x\nnot data"), null);
  } finally {
    await fake.close();
  }
});

Deno.test("json helpers: validation, fences and surrounding prose", () => {
  assertEquals(validateJson({ files: [{ file: "a.html", html: "x" }] }, DESIGN_TOOL.schema), []);
  assert(validateJson({ files: [{ file: "a.html" }] }, DESIGN_TOOL.schema).some((p) => p.includes("html: missing")));
  assert(validateJson({ files: "no" }, DESIGN_TOOL.schema)[0]!.includes("expected array"));
  assert(validateJson({ files: [], extra: 1 }, DESIGN_TOOL.schema).some((p) => p.includes("not allowed")));
  assertEquals(extractJson('Here you go:\n```json\n{"a":1}\n```'), { a: 1 });
  assertEquals(extractJson('Sure! {"a":{"b":2}} done'), { a: { b: 2 } });
  assertThrows(() => extractJson("no json here"), Error, "No JSON");
});

Deno.test("lemonade provider: streams partial output and asks for a JSON-schema response", async () => {
  const fake = await startFakeLemonade({ answers: [GOOD] });
  try {
    const p = createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "user.M" });
    const partials: string[] = [];
    assertEquals(await p.call(input({ onPartial: (s) => partials.push(s) })), JSON.parse(GOOD));
    assertEquals(partials.at(-1), GOOD);
    const chat = fake.requests.find((r) => r.path === "/chat/completions")!.body!;
    assertEquals(chat.model, "user.M");
    assertEquals(chat.stream, true);
    assertEquals((chat.response_format as { type: string }).type, "json_schema");
    assertEquals(chat.chat_template_kwargs, { enable_thinking: false });
    const system = (chat.messages as { role: string; content: string }[])[0]!;
    assertStringIncludes(system.content, "Return only one JSON object");
    assertEquals(p.id, "lemonade");
  } finally {
    await fake.close();
  }
});

Deno.test("lemonade provider: a server without JSON-schema support gets the strict prompt instead, and is not asked again", async () => {
  const fake = await startFakeLemonade({ rejectSchema: true, answers: [GOOD] });
  try {
    const p = createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "m" });
    assertEquals(await p.call(input()), JSON.parse(GOOD));
    assertEquals(await p.call(input()), JSON.parse(GOOD));
    const chats = fake.requests.filter((r) => r.path === "/chat/completions");
    assertEquals(chats.map((c) => "response_format" in c.body!), [true, false, false]);
  } finally {
    await fake.close();
  }
});

Deno.test("lemonade provider: an invalid answer is sent back with the problems and the corrected one is used", async () => {
  const fake = await startFakeLemonade({
    answers: ["I think the design is nice.", '{"files":[{"file":"v1.html"}]}', `Sure:\n\`\`\`json\n${GOOD}\n\`\`\``],
  });
  try {
    const p = createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "m" });
    assertEquals(await p.call(input()), JSON.parse(GOOD));
    const chats = fake.requests.filter((r) => r.path === "/chat/completions");
    assertEquals(chats.length, 3);
    const last = (chats[2]!.body!.messages as { content: string }[]).at(-1)!.content;
    assertStringIncludes(last, "html: missing");
  } finally {
    await fake.close();
  }
});

Deno.test("lemonade provider: gives up after three tries with a readable error", async () => {
  const fake = await startFakeLemonade({ answers: ["nope"] });
  try {
    const p = createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "m" });
    await assertRejects(() => p.call(input({ tool: PATCH_TOOL })), Error, "after 3 tries");
    assertEquals(fake.requests.filter((r) => r.path === "/chat/completions").length, 3);
  } finally {
    await fake.close();
  }
});

Deno.test("lemonade provider: unreachable server, no loaded model and a rejected key give actionable messages", async () => {
  const dead = createLemonadeProvider({ client: new LemonadeClient(await deadBaseUrl()), model: () => "m" });
  await assertRejects(() => dead.call(input()), Error, "LEMONADE_BASE_URL");
  const none = createLemonadeProvider({ client: new LemonadeClient(await deadBaseUrl()), model: () => "" });
  await assertRejects(() => none.call(input()), Error, "No local model");
  const fake = await startFakeLemonade({ apiKey: "k", answers: [GOOD] });
  try {
    await assertRejects(
      () => createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "m" }).call(input()),
      Error,
      "401",
    );
    assertEquals(
      await createLemonadeProvider({ client: new LemonadeClient(fake.base, "k"), model: () => "m" }).call(input()),
      JSON.parse(GOOD),
    );
  } finally {
    await fake.close();
  }
});

Deno.test("lemonade provider: a reference image goes as an image part", async () => {
  const fake = await startFakeLemonade({ answers: [GOOD] });
  try {
    const p = createLemonadeProvider({ client: new LemonadeClient(fake.base), model: () => "m" });
    await p.call(input({ image: { mime: "image/png", base64: "AAAA" } }));
    const user = (fake.requests.find((r) => r.path === "/chat/completions")!.body!.messages as { content: { type: string }[] }[])[1]!;
    assertEquals(user.content.map((c) => c.type), ["image_url", "text"]);
  } finally {
    await fake.close();
  }
});
