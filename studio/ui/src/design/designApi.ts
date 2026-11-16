// Typed calls to the studio server. The browser never sees a provider key or writes a file by itself.
import type {
  DesignBeginResult,
  DesignCommand,
  DesignList,
  DirectionSelection,
  DirectionSet,
  DirectionsInput,
  DirectionsView,
} from "../../../shared/design/index.ts";
import type { Tokens } from "../../../shared/design/tokens.ts";

type Begin = Extract<DesignCommand, { kind: "begin" }>;

export interface StudioConfig {
  name: string;
  provider: { id: string; label: string; note: string | null };
  stitch: boolean;
  hasTokens: boolean;
  hasDesignMd: boolean;
  tokens: Tokens | null;
  presets: { id: string; name: string; description: string; tokens: Tokens }[];
  apps: { stack: string; kind: string; dir: string; name: string }[];
  kit: boolean;
}
export type DiffLine = { kind: "same" | "add" | "del"; text: string };
export interface PlanFileView {
  path: string;
  status: "new" | "changed" | "unchanged";
  binary: boolean;
  bytes: number;
  diff: DiffLine[];
}
export interface PlanView {
  id: string;
  files: PlanFileView[];
}
export interface LintIssue {
  id: string;
  message: string;
  fix: string;
}
export interface ExportResult {
  blocked: LintIssue[];
  warnings: LintIssue[];
  codeIssues: { id: string; message: string }[];
  notes: string[];
  plan: PlanView | null;
}
export type DesignListWithJobs = DesignList & {
  jobs?: Record<string, { state: "running" | "done" | "error"; errors: Record<string, string> }>;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const designApi = {
  config: async (): Promise<StudioConfig> => (await fetch("/api/config")).json(),
  run: <T>(command: DesignCommand | Record<string, unknown>) => post<T>("/api/design", { command }),
  list: () => post<DesignListWithJobs>("/api/design", { command: { kind: "list" } }),
  read: (slug: string, file: string) => post<string>("/api/design", { command: { kind: "read", slug, file } }),
  begin: (command: Omit<Begin, "kind">) => {
    const { reference, ...rest } = command;
    let bin = "";
    if (reference) { for (const b of reference.bytes) bin += String.fromCharCode(b); }
    return post<DesignBeginResult>("/api/design", {
      command: { kind: "begin", ...rest, ...(reference ? { reference: { mime: reference.mime, base64: btoa(bin) } } : {}) },
    });
  },
  stitchGenerate: (input: { name: string; brief: string; target: string; count: number }) =>
    post<{ slug: string }>("/api/design", { command: { kind: "stitch-generate", ...input } }),
  inlineRemote: (slug: string, file: string) => post<void>("/api/design", { command: { kind: "inline-remote", slug, file } }),
  importStitch: (folder: string) =>
    post<{ slug: string; importedMd: string | null }>("/api/design", { command: { kind: "import-stitch", folder } }),
  directions: {
    list: () => post<DirectionsView>("/api/design", { command: { kind: "directions-list" } }),
    generate: (input: DirectionsInput) => post<DirectionSet>("/api/design", { command: { kind: "directions-begin", ...input } }),
    lock: (directionId: string, notes: string) =>
      post<DirectionSelection>("/api/design", { command: { kind: "directions-select", directionId, notes } }),
    unlock: () => post<void>("/api/design", { command: { kind: "directions-unlock" } }),
    read: (id: string, screen: string) => post<string>("/api/design", { command: { kind: "directions-read", id, screen } }),
    readMd: (id: string) => post<string | null>("/api/design", { command: { kind: "directions-md", id } }),
  },
  plan: (files: { path: string; content: string; binary?: boolean }[]) => post<PlanView>("/api/plan", { files }),
  apply: (planId: string) => post<{ written: string[] }>("/api/apply", { planId }),
  prepareExport: (
    req: { slug: string; file: string; app: number; feature: string; screen: string; screenshots: boolean; force: boolean },
  ) => post<ExportResult>("/api/export/prepare", req),
  check: () => post<{ ok: boolean; code: number | null; output: string }>("/api/check", {}),
};

export type DesignApi = typeof designApi;
