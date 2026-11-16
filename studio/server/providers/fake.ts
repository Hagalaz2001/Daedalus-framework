// Deterministic provider for tests and offline demos: no network, no key, no cost. It answers each tool from the
// fixtures, and streams the JSON in chunks so the progressive canvas gets exercised like a real model run.
import { tokensFromDesignMd } from "../../shared/design/tokens.ts";
import { tokensCss } from "../context.ts";
import { fixtureDesigns } from "./fixtures.ts";
import { fixtureScreenCode } from "./fixtureCode.ts";
import type { CallInput, Provider } from "./types.ts";

const between = (text: string, start: RegExp): string | null => start.exec(text)?.[1] ?? null;
const fenced = (text: string, label: string): string | null =>
  between(text, new RegExp(`<<<${label}-[0-9a-f]+\\n([\\s\\S]*?)\\n${label}-[0-9a-f]+>>>`));

/** The token block the studio put in the system prompt (or a direction's own DESIGN.md), so fixtures follow the project. */
function tokensFor(input: CallInput): string {
  const direction = fenced(input.user, "DIRECTION-DESIGN");
  const fromDirection = direction ? tokensFromDesignMd(direction) : null;
  if (fromDirection) return tokensCss(fromDirection);
  const system = input.system.map((b) => b.text).join("\n");
  return between(system, /```css\n([\s\S]*?)\n```/) ??
    ":root{--color-primary:#2a4bd7;--color-on-primary:#fff;--color-surface:#fff;--color-surface-muted:#f5f6f8;--color-text:#0e1116;--color-text-muted:#525a66;--color-border:#e1e4ea;--color-success:#17743d;--color-warning:#a15c07;--color-danger:#b42318;--radius-sm:6px;--radius-md:10px;--radius-lg:14px;--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-6:24px;--space-8:32px;--font-sans:system-ui,sans-serif;--font-display:system-ui,sans-serif}";
}

function filesFrom(user: string): string[] {
  const list = between(user, /Return exactly these (?:\d+ )?files[^:]*: ([^\n]+)/);
  if (!list) return ["v1.html"];
  return [...list.matchAll(/([a-z0-9][a-z0-9-]*\.html)/g)].map((m) => m[1]!);
}

function patchFor(instruction: string): unknown {
  const i = instruction.toLowerCase();
  if (/sticky/.test(i)) return { ops: [{ op: "classes", selector: "header, .bar, .sidebar", add: ["sticky-top"], all: false }] };
  if (/empty/.test(i)) {
    return {
      ops: [{ op: "attr", selector: '[data-state="ready"]', name: "hidden", value: "hidden" }, {
        op: "attr",
        selector: '[data-state="empty"]',
        name: "data-state",
        value: "empty",
      }],
    };
  }
  const rename = /rename (?:the )?title to ["']?([^"'\n]+)/i.exec(instruction);
  return { ops: [{ op: "text", selector: "h1", text: rename?.[1]?.trim() || "Today at a glance" }] };
}

export function createFakeProvider(delayMs = Number(Deno.env.get("STUDIO_FAKE_DELAY_MS") ?? 25)): Provider {
  return {
    id: "fake",
    label: "Fake provider (fixtures)",
    note: "Deterministic fixtures, no model involved.",
    async call(input) {
      let result: unknown;
      if (input.tool.name === "write_designs") {
        const brief = fenced(input.user, "BRIEF") ?? input.user;
        const index = Number(between(input.user, /Design variant (\d+) of/) ?? 1) - 1;
        result = { files: fixtureDesigns(brief, filesFrom(input.user), tokensFor(input), index) };
      } else if (input.tool.name === "write_patch") {
        result = patchFor(fenced(input.user, "INSTRUCTION") ?? "");
      } else if (input.tool.name === "write_screen_code") {
        const kind = /Dart widget/.test(input.user) ? "flutter" : /React Native/.test(input.user) ? "react-native" : "react";
        const name = between(input.user, /named (\w+)/) ?? "Screen";
        result = { screenName: name, code: fixtureScreenCode(kind, name) };
      } else throw new Error(`The fake provider does not know the tool ${input.tool.name}.`);
      const raw = JSON.stringify(result);
      for (let at = 0; at < raw.length; at += 480) {
        input.signal?.throwIfAborted();
        input.onPartial?.(raw.slice(0, at + 480));
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      }
      return result;
    },
  };
}
