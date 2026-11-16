// The export flow: lint gate, translation by the provider, generated-code checks, screenshots, and a plan for review.
import { lintDesign, type LintWarning } from "../shared/design/designLint.ts";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readDesign } from "./design/projectDesignStore.ts";
import { type ProjectContext, tokenMap } from "./context.ts";
import { type CodeIssue, lintGeneratedCode } from "./codeLint.ts";
import { type CodeKind, exportPaths, kindOfStack, type PlannedFile, withBarrelExport } from "./export.ts";
import { CODE_TOOL, exportPrompt, systemBlocks } from "./prompts.ts";
import type { Provider } from "./providers/types.ts";
import { screenshotSet } from "./screenshots.ts";

/** Lint rules that stop an export. Placeholder copy can never be forced through. */
export const BLOCKING = [
  "lorem-ipsum",
  "no-tokens",
  "token-drift",
  "off-token-colors",
  "contrast",
  "list-states",
  "touch-targets",
] as const;
const NEVER_FORCE = ["lorem-ipsum"];

export interface ExportRequest {
  slug: string;
  file: string;
  /** Index into the project's apps. */
  app: number;
  feature: string;
  screen: string;
  screenshots?: boolean;
  /** Export although lint found blocking issues (not for placeholder copy). */
  force?: boolean;
}

export interface ExportPrepared {
  blocked: LintWarning[];
  warnings: LintWarning[];
  codeIssues: CodeIssue[];
  files: PlannedFile[];
  notes: string[];
}

export const kindOfApp = (
  ctx: ProjectContext,
  index: number,
): { kind: CodeKind; app: ProjectContext["apps"][number] } => {
  const app = ctx.apps[index];
  if (!app) throw new Error("This project has no app to export into. Generate it with a web or mobile stack first.");
  const kind = kindOfStack(app.stack);
  if (!kind) {
    throw new Error(
      `The studio cannot export to the ${app.stack} stack yet: it exports React, React Native and Flutter screens (stacks with an "export" block in stack.json).`,
    );
  }
  return { kind, app };
};

async function kitDocsFor(ctx: ProjectContext, kind: CodeKind, appDir: string): Promise<string | null> {
  if (kind === "react") return ctx.kitDocs;
  const rel = kind === "react-native" ? join(appDir, "src", "shared", "ui", "index.ts") : null;
  if (!rel) return null;
  return await readFile(join(ctx.root, rel), "utf8").catch(() => null);
}

export async function prepareExport(
  deps: { ctx: ProjectContext; provider: Provider; root: string },
  req: ExportRequest,
): Promise<ExportPrepared> {
  const { ctx, provider, root } = deps;
  const { kind, app } = kindOfApp(ctx, req.app);
  const html = await readDesign(root, req.slug, req.file);
  const manifest = JSON.parse(await readFile(join(root, "design", req.slug, "design.json"), "utf8")) as {
    brief: string;
    target: "web-desktop" | "web-mobile" | "flutter-phone";
  };
  const warnings = lintDesign(html, {
    brief: manifest.brief,
    target: manifest.target,
    ...(ctx.tokens ? { projectTokens: tokenMap(ctx.tokens) } : {}),
  });
  const blocked = warnings.filter((w) => (BLOCKING as readonly string[]).includes(w.id));
  const forceable = blocked.filter((w) => !NEVER_FORCE.includes(w.id));
  if (blocked.length && (!req.force || blocked.length !== forceable.length)) {
    return { blocked, warnings, codeIssues: [], files: [], notes: ["Fix the blocking issues first."] };
  }

  const paths = exportPaths({ app, kind, feature: req.feature, screen: req.screen });
  const system = systemBlocks(ctx);
  const prompt = exportPrompt(html, { kind, kitDocs: await kitDocsFor(ctx, kind, app.dir) }, req.screen);
  let code = ((await provider.call({ system, user: prompt, tool: CODE_TOOL })) as { code?: string }).code ?? "";
  let issues = lintGeneratedCode(kind, code);
  if (issues.length) {
    // One repair pass: tell the model exactly what the checks found.
    const retry = ((await provider.call({
      system,
      user: `${prompt}\n\nYour previous answer failed these checks, fix them and return the whole file again:\n${
        issues.map((i) => `- ${i.message}`).join("\n")
      }`,
      tool: CODE_TOOL,
    })) as { code?: string }).code;
    if (retry) {
      code = retry;
      issues = lintGeneratedCode(kind, code);
    }
  }
  const files: PlannedFile[] = [{ path: paths.screen, content: code.endsWith("\n") ? code : `${code}\n` }];
  if (paths.barrel) {
    const existing = await readFile(join(root, paths.barrel), "utf8").catch(() => null);
    files.push({ path: paths.barrel, content: withBarrelExport(existing, req.screen, kind) });
  }
  const notes: string[] = [];
  if (req.screenshots) {
    const shots = await screenshotSet(html, `${req.screen.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`);
    files.push(...shots.files);
    if (shots.skipped) notes.push(shots.skipped);
  }
  return { blocked: [], warnings, codeIssues: issues, files, notes };
}
