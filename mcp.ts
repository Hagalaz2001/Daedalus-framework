// Daedalus MCP server (stdio): lets any MCP client create and extend projects without hand-copying templates.
// Run: `daedalus mcp` or `deno run -A mcp.ts`. Tools never deploy, push, delete or publish anything; the only
// writes are the project folder you name (new_project refuses a non-empty one) and files inside an existing project.
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.32.2/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/server/stdio.js";
import { z } from "npm:zod@4.6.7";
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";
import { existsSync, readFileSync } from "node:fs";
import { describe, type ItemKind, list, readDoc, searchDocs } from "./lib/catalog.ts";

const root = dirname(fromFileUrl(import.meta.url));

/** Runs `cli.ts <args> --json` in a child process and returns the parsed JSON document it printed. */
export async function runCli(args: string[]): Promise<Record<string, unknown>> {
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", join(root, "cli.ts"), ...args, "--json"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout);
  try {
    return JSON.parse(text.slice(text.indexOf("{")));
  } catch {
    return { ok: false, error: { kind: "internal", message: `No JSON from daedalus: ${new TextDecoder().decode(out.stderr).slice(-500)}` }, steps: [] };
  }
}

type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
const result = (data: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
  isError: data.ok === false ? true : undefined,
});
/** Catalog lookups throw UsageError on bad input; report that as a tool error instead of crashing the call. */
const guarded = (fn: () => Record<string, unknown>): ToolResult => {
  try {
    return result({ ok: true, ...fn() });
  } catch (e) {
    return result({ ok: false, error: { kind: "usage", message: e instanceof Error ? e.message : String(e) } });
  }
};

const csv = (v?: string[]) => (v?.length ? v.join(",") : undefined);
const flags = (o: Record<string, string | undefined>) => Object.entries(o).flatMap(([k, v]) => (v ? [`--${k}`, v] : []));
const dir = z.string().min(1).describe("Absolute path of the project folder");

export function createServer(): McpServer {
  const server = new McpServer({ name: "daedalus", version: "2.0.0" });
  // The SDK infers handler arguments from the zod shapes only when its types resolve against zod 4; they do not under
  // Deno's npm resolution, so arguments are typed loosely here and validated at runtime by the zod shapes.
  // deno-lint-ignore no-explicit-any
  type Args = any;
  // deno-lint-ignore no-explicit-any
  const reg = (name: string, cfg: Record<string, unknown>, h: (a: Args) => unknown) => (server as any).registerTool(name, cfg, h);
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

  const kinds = ["stack", "module", "pack", "preset"] as const;
  for (const k of kinds) {
    reg(`list_${k}s`, { title: `List ${k}s`, description: `List available ${k}s with id, title and description.`, inputSchema: {}, annotations: readOnly }, () =>
      guarded(() => ({ command: "list", kind: k, items: list(root, k) })));
  }
  reg("describe", {
    title: "Describe an item",
    description: "Full manifest (and README when present) of one stack, module, pack or UI preset.",
    inputSchema: { kind: z.enum(kinds), id: z.string() },
    annotations: readOnly,
  }, ({ kind, id }) => guarded(() => ({ command: "describe", item: describe(root, kind as ItemKind, id) })));

  reg("new_project", {
    title: "Create a project",
    description:
      "Generate a new project: base template plus the chosen stacks, modules and packs; installs dependencies, syncs generated files, runs checks. Refuses a folder that exists and is not empty. Does not commit or push. Can take several minutes.",
    inputSchema: {
      dir,
      name: z.string().optional().describe("Display name"),
      id: z.string().optional().describe("Reverse-domain bundle id, e.g. com.example.app (mobile apps)"),
      web: z.string().optional().describe("Comma list of: spa, spa-vue, site, site-next, none"),
      mobile: z.enum(["flutter", "rn", "none"]).optional(),
      desktop: z.enum(["gpui", "tauri", "none"]).optional(),
      backend: z.enum(["hono", "none"]).optional(),
      ui: z.string().optional().describe("UI preset id (see list_presets)"),
      islands: z.enum(["react", "vue"]).optional().describe("Framework for interactive parts of the Astro site"),
      modules: z.array(z.string()).optional(),
      packs: z.array(z.string()).optional(),
      skip_check: z.boolean().optional().describe("Skip the final `deno task check` (faster)"),
    },
    annotations: writes,
  }, async (a) =>
    result(await runCli([
      "new", a.dir, "--yes",
      ...flags({ name: a.name, id: a.id, web: a.web, mobile: a.mobile, desktop: a.desktop, backend: a.backend, ui: a.ui, islands: a.islands, modules: csv(a.modules), packs: csv(a.packs) }),
      ...(a.skip_check ? ["--no-check"] : []),
    ])));

  reg("add_app", {
    title: "Add an app to a project",
    description: "Add another app of any stack to an existing Daedalus project (second SPA, admin app, desktop client ...).",
    inputSchema: { dir, stack: z.string(), name: z.string().describe("Folder name under apps/"), id: z.string().optional(), skip_check: z.boolean().optional() },
    annotations: writes,
  }, async (a) => result(await runCli(["add-app", a.stack, a.name, "--project", a.dir, ...flags({ id: a.id }), ...(a.skip_check ? ["--no-check"] : [])])));
  for (const k of ["module", "pack"] as const) {
    reg(`add_${k}`, {
      title: `Apply a ${k}`,
      description: `Apply one or more ${k}s to an existing project. Never overwrites existing files.`,
      inputSchema: { dir, names: z.array(z.string()).min(1), skip_check: z.boolean().optional() },
      annotations: writes,
    }, async (a) => result(await runCli([`add-${k}`, a.names.join(","), "--project", a.dir, ...(a.skip_check ? ["--no-check"] : [])])));
  }

  reg("sync", {
    title: "Sync generated files",
    description: "Run `deno task sync` in a project: regenerate API clients and theme files from the contract and tokens.",
    inputSchema: { dir },
    annotations: writes,
  }, async ({ dir: d }) => result(await runCli(["sync", d])));
  reg("check", {
    title: "Run project checks",
    description: "Run `deno task check` in a project and return one entry per step with ok, exit code and the output tail. Read-only apart from regenerating synced files.",
    inputSchema: { dir },
    annotations: writes,
  }, async ({ dir: d }) => result(await runCli(["check", d])));

  reg("docs_search", {
    title: "Search Daedalus docs",
    description: "Search the Daedalus documentation (README, architecture, AI workflow, stack and module docs). Returns the best documents with a snippet.",
    inputSchema: { query: z.string().min(2), limit: z.number().int().min(1).max(20).optional() },
    annotations: readOnly,
  }, ({ query, limit }) => guarded(() => ({ command: "docs", query, results: searchDocs(root, query, limit ?? 8) })));
  reg("docs_read", {
    title: "Read a Daedalus doc",
    description: "Read one document by the path returned from docs_search.",
    inputSchema: { path: z.string() },
    annotations: readOnly,
  }, ({ path }) => guarded(() => ({ command: "docs_read", path, text: readDoc(root, path) })));

  const resources: [string, string, string][] = [
    ["architecture", "template/docs/ARCHITECTURE.md", "Architecture rules every app follows"],
    ["ai-workflow", "template/docs/AI-WORKFLOW.md", "How people and AI agents work together"],
    ["modules", "template/docs/MODULES.md", "Optional feature modules"],
    ["studio", "studio/README.md", "The design studio"],
    ["cli", "docs/CLI.md", "CLI and JSON reference"],
    ["integrations", "docs/INTEGRATIONS.md", "Driving Daedalus from AI coding tools"],
  ];
  for (const [id, path, description] of resources) {
    if (!existsSync(join(root, path))) continue;
    server.registerResource(id, `daedalus://docs/${id}`, { title: path, description, mimeType: "text/markdown" }, (uri: URL) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: readFileSync(join(root, path), "utf8") }],
    }));
  }
  return server;
}

if (import.meta.main) {
  await createServer().connect(new StdioServerTransport());
}
