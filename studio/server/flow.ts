// The flow board's arrows live in design/studio/flow.json (small, sorted, git-friendly). This is the only file the
// studio writes without a diff review: it holds layout metadata, never source code.
import { join } from "node:path";
import { isSafeDesignName } from "../shared/design/index.ts";
import { readProjectText, writeProjectFile } from "./design/projectDesignFs.ts";

export interface FlowArrow {
  from: string;
  to: string;
  label?: string;
}
export interface Flow {
  version: 1;
  arrows: FlowArrow[];
}

const FILE = join("design", "studio", "flow.json");

export function parseFlow(raw: unknown): Flow {
  const list = (raw as { arrows?: unknown } | null)?.arrows;
  if (!Array.isArray(list) || list.length > 100) throw new Error("A flow has up to 100 arrows.");
  const seen = new Set<string>();
  const arrows: FlowArrow[] = [];
  for (const a of list as Partial<FlowArrow>[]) {
    if (!isSafeDesignName(a?.from) || !isSafeDesignName(a?.to) || a.from === a.to) {
      throw new Error("Each arrow connects two different screens.");
    }
    const key = `${a.from}>${a.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = typeof a.label === "string" ? a.label.trim().slice(0, 40) : "";
    arrows.push({ from: a.from, to: a.to, ...(label ? { label } : {}) });
  }
  arrows.sort((x, y) => `${x.from}>${x.to}`.localeCompare(`${y.from}>${y.to}`));
  return { version: 1, arrows };
}

export async function readFlow(root: string): Promise<Flow> {
  try {
    return parseFlow(JSON.parse(await readProjectText(root, join(root, FILE), 256 * 1024)));
  } catch {
    return { version: 1, arrows: [] };
  }
}

export async function writeFlow(root: string, raw: unknown): Promise<Flow> {
  const flow = parseFlow(raw);
  await writeProjectFile(root, join(root, FILE), `${JSON.stringify(flow, null, 2)}\n`);
  return flow;
}
