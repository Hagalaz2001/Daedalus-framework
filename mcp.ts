// Daedalus MCP server (stdio): lets any MCP client create and extend projects without hand-copying templates.
// Run: `daedalus mcp` or `deno run -A mcp.ts`. Tools never deploy, push, delete or publish anything; the only
// writes are the project folder you name (new_project refuses a non-empty one) and files inside an existing project.
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.32.2/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/server/stdio.js";
import { z } from "npm:zod@4.6.7";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { describe, type ItemKind, list, readDoc, searchDocs } from "./lib/catalog.ts";
import { flagChoices } from "./lib/blueprint.ts";
import { ensureAssets } from "./lib/assets.ts";
import { isCompiled } from "./lib/home.ts";
import { VERSION } from "./lib/version.ts";

const root = await ensureAssets();
/** A tool call that runs longer than this is cancelled and its child process killed (new_project installs and builds: minutes). */
const TOOL_TIMEOUT_MS: number = Number(Deno.env.get("DAEDALUS_MCP_TIMEOUT_MS")) || 30 * 60_000;

/** Runs `cli.ts <args> --json` in a child process and returns the parsed JSON document it printed. */
export async function runCli(args: string[], timeoutMs = TOOL_TIMEOUT_MS): Promise<Record<string, unknown>> {
  let out: Deno.CommandOutput;
  try {
    out = await new Deno.Command(Deno.execPath(), {
      // A compiled binary is the CLI itself; under deno, run cli.ts (a file or a jsr.io URL) in a child.
      args: [...(isCompiled() ? [] : ["run", "-A", new URL("./cli.ts", import.meta.url).href]), ...args, "--json"],
      env: { DAEDALUS_HOME: root },
      stdout: "piped",
      stderr: "piped",
      signal: AbortSignal.timeout(timeoutMs),
    }).output();
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    return {
      ok: false,
      error: {
        kind: "internal",
        message: timedOut
          ? `daedalus did not finish within ${Math.round(timeoutMs / 1000)}s and was stopped`
          : String(e),
      },
      steps: [],
    };
  }
  const text = new TextDecoder().decode(out.stdout);
  try {
    return JSON.parse(text.slice(text.indexOf("{")));
  } catch {
    return {
      ok: false,
      error: {
        kind: "internal",
        message: `No JSON from daedalus: ${new TextDecoder().decode(out.stderr).slice(-500)}`,
      },
      steps: [],
    };
  }
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
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
const flags = (o: Record<string, string | undefined>) =>
  Object.entries(o).flatMap(([k, v]) => (v ? [`--${k}`, v] : []));
const dir = z.string().min(1).describe("Absolute path of the project folder");

export function createServer(): McpServer {
  const server = new McpServer({ name: "daedalus", version: VERSION });
  // The SDK infers handler arguments from the zod shapes only when its types resolve against zod 4; they do not under
  // Deno's npm resolution, so arguments are typed loosely here and validated at runtime by the zod shapes.
  // deno-lint-ignore no-explicit-any
  type Args = any;
  const reg = (name: string, cfg: Record<string, unknown>, h: (a: Args) => unknown) =>
    // deno-lint-ignore no-explicit-any
    (server as any).registerTool(name, cfg, h);
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

  const kinds = ["stack", "module", "pack", "preset"] as const;
  for (const k of kinds) {
    reg(`list_${k}s`, {
      title: `List ${k}s`,
      description: `List available ${k}s with id, title and description.`,
      inputSchema: {},
      annotations: readOnly,
    }, () => guarded(() => ({ command: "list", kind: k, items: list(root, k) })));
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
      web: z.string().optional().describe(`Comma list of: ${flagChoices("web", root).split("|").join(", ")}, none`),
      mobile: z.string().optional().describe(`One of: ${flagChoices("mobile", root).split("|").join(", ")}, none`),
      desktop: z.string().optional().describe(`One of: ${flagChoices("desktop", root).split("|").join(", ")}, none`),
      backend: z.enum(["hono", "none"]).optional(),
      ui: z.string().optional().describe("UI preset id (see list_presets)"),
      islands: z.enum(["react", "vue"]).optional().describe("Framework for interactive parts of the Astro site"),
      modules: z.array(z.string()).optional(),
      packs: z.array(z.string()).optional(),
      skip_check: z.boolean().optional().describe("Skip the final `deno task check` (faster)"),
    },
    annotations: writes,
  }, async (a) =>
    result(
      await runCli([
        "new",
        a.dir,
        "--yes",
        ...flags({
          name: a.name,
          id: a.id,
          web: a.web,
          mobile: a.mobile,
          desktop: a.desktop,
          backend: a.backend,
          ui: a.ui,
          islands: a.islands,
          modules: csv(a.modules),
          packs: csv(a.packs),
        }),
        ...(a.skip_check ? ["--no-check"] : []),
      ]),
    ));

  reg(
    "add_app",
    {
      title: "Add an app to a project",
      description:
        "Add another app of any stack to an existing Daedalus project (second SPA, admin app, desktop client ...).",
      inputSchema: {
        dir,
        stack: z.string(),
        name: z.string().describe("Folder name under apps/"),
        id: z.string().optional(),
        skip_check: z.boolean().optional(),
      },
      annotations: writes,
    },
    async (a) =>
      result(
        await runCli([
          "add-app",
          a.stack,
          a.name,
          "--project",
          a.dir,
          ...flags({ id: a.id }),
          ...(a.skip_check ? ["--no-check"] : []),
        ]),
      ),
  );
  for (const k of ["module", "pack"] as const) {
    reg(
      `add_${k}`,
      {
        title: `Apply a ${k}`,
        description: `Apply one or more ${k}s to an existing project. Never overwrites existing files.`,
        inputSchema: { dir, names: z.array(z.string()).min(1), skip_check: z.boolean().optional() },
        annotations: writes,
      },
      async (a) =>
        result(
          await runCli([`add-${k}`, a.names.join(","), "--project", a.dir, ...(a.skip_check ? ["--no-check"] : [])]),
        ),
    );
  }

  reg("sync", {
    title: "Sync generated files",
    description:
      "Run `deno task sync` in a project: regenerate API clients and theme files from the contract and tokens.",
    inputSchema: { dir },
    annotations: writes,
  }, async ({ dir: d }) => result(await runCli(["sync", d])));
  reg("check", {
    title: "Run project checks",
    description:
      "Run `deno task check` in a project and return one entry per step with ok, exit code and the output tail. Read-only apart from regenerating synced files.",
    inputSchema: { dir },
    annotations: writes,
  }, async ({ dir: d }) => result(await runCli(["check", d])));

  reg("docs_search", {
    title: "Search Daedalus docs",
    description:
      "Search the Daedalus documentation (README, architecture, AI workflow, stack and module docs). Returns the best documents with a snippet.",
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
    ["studio", "docs/STUDIO.md", "The design studio"],
    ["cli", "docs/CLI.md", "CLI and JSON reference"],
    ["integrations", "docs/INTEGRATIONS.md", "Driving Daedalus from AI coding tools"],
  ];
  for (const [id, path, description] of resources) {
    if (!existsSync(join(root, path))) continue;
    server.registerResource(
      id,
      `daedalus://docs/${id}`,
      { title: path, description, mimeType: "text/markdown" },
      (uri: URL) => ({
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: readFileSync(join(root, path), "utf8") }],
      }),
    );
  }
  return server;
}

/** Serves the MCP tools on stdin/stdout until the client disconnects. */
export async function serveStdio(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

if (import.meta.main) await serveStdio();
