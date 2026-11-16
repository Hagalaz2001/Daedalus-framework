import { assert, assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { Client } from "npm:@modelcontextprotocol/sdk@1.32.2/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/inMemory.js";
import { createServer } from "./mcp.ts";

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, close: () => client.close() };
}

// deno-lint-ignore no-explicit-any
const call = async (client: Client, name: string, args: Record<string, unknown> = {}): Promise<any> => {
  const r = await client.callTool({ name, arguments: args });
  return { isError: r.isError === true, data: r.structuredContent ?? JSON.parse(String((r.content as { text: string }[])[0].text)) };
};

Deno.test("mcp: exposes the expected tools and nothing outward-facing", async () => {
  const { client, close } = await connect();
  const names = (await client.listTools()).tools.map((t: { name: string }) => t.name);
  for (const n of ["list_stacks", "list_modules", "list_packs", "list_presets", "describe", "new_project", "add_app", "add_module", "add_pack", "sync", "check", "docs_search"]) {
    assert(names.includes(n), `missing tool ${n}`);
  }
  assertEquals(names.filter((n: string) => /deploy|push|publish|delete|remove|commit/.test(n)), []);
  await close();
});

Deno.test("mcp: list and describe return structured data", async () => {
  const { client, close } = await connect();
  const stacks = await call(client, "list_stacks");
  assertEquals(stacks.data.ok, true);
  assert(stacks.data.items.some((i: { id: string }) => i.id === "mobile-flutter"));
  assert((await call(client, "list_presets")).data.items.length >= 2);
  const d = await call(client, "describe", { kind: "stack", id: "mobile-flutter" });
  assertEquals(d.data.item.manifest.id, "mobile-flutter");
  const bad = await call(client, "describe", { kind: "stack", id: "nope" });
  assertEquals([bad.isError, bad.data.error.kind], [true, "usage"]);
  await close();
});

Deno.test("mcp: docs_search finds the architecture document", async () => {
  const { client, close } = await connect();
  const r = await call(client, "docs_search", { query: "feature boundaries architecture" });
  assert(r.data.results.some((h: { path: string }) => h.path.endsWith("ARCHITECTURE.md")));
  await close();
});

Deno.test("mcp: new_project refuses a non-empty folder; add_app needs a project", async () => {
  const { client, close } = await connect();
  const dir = Deno.makeTempDirSync();
  try {
    Deno.writeTextFileSync(join(dir, "keep.txt"), "x");
    const r = await call(client, "new_project", { dir, skip_check: true });
    assertEquals([r.isError, r.data.error.kind], [true, "usage"]);
    assertEquals(Deno.readTextFileSync(join(dir, "keep.txt")), "x");
    const a = await call(client, "add_app", { dir, stack: "mobile-flutter", name: "x", skip_check: true });
    assertEquals(a.isError, true);
  } finally {
    Deno.removeSync(dir, { recursive: true });
    await close();
  }
});

Deno.test("mcp: resources expose the architecture doc", async () => {
  const { client, close } = await connect();
  const res = await client.listResources();
  assert(res.resources.some((r: { uri: string }) => r.uri === "daedalus://docs/architecture"));
  const text = await client.readResource({ uri: "daedalus://docs/architecture" });
  assert(String(text.contents[0].text).includes("Architecture"));
  await close();
});
