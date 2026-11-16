// Shared test helpers: a throwaway project with tokens, DESIGN.md and a manifest, and a small wait.
import { join } from "node:path";
import type { Tokens } from "../context.ts";

export const TOKENS: Tokens = {
  color: {
    primary: "#2a4bd7",
    onPrimary: "#ffffff",
    surface: "#ffffff",
    surfaceMuted: "#f5f6f8",
    text: "#0e1116",
    textMuted: "#525a66",
    border: "#e1e4ea",
    success: "#17743d",
    warning: "#a15c07",
    danger: "#b42318",
  },
  colorDark: {
    primary: "#8da2ff",
    onPrimary: "#0b1030",
    surface: "#0e1116",
    surfaceMuted: "#161a21",
    text: "#eef0f4",
    textMuted: "#a3abb8",
    border: "#262b34",
    success: "#4ccb85",
    warning: "#f0b45a",
    danger: "#ff8a7d",
  },
  radius: { sm: 6, md: 10, lg: 14 },
  space: { "1": 4, "2": 8, "3": 12, "4": 16, "6": 24, "8": 32 },
  font: { sans: "Geist", display: "Geist", mono: "Geist Mono" },
};

export function makeProject(
  apps = [{ stack: "web-spa", kind: "web", dir: "apps/web", name: "web" }, {
    stack: "mobile-flutter",
    kind: "mobile",
    dir: "apps/mobile",
    name: "mobile",
  }],
): string {
  const root = Deno.makeTempDirSync({ prefix: "studio-test-" });
  Deno.mkdirSync(join(root, "design"), { recursive: true });
  Deno.writeTextFileSync(join(root, "design", "tokens.json"), JSON.stringify(TOKENS, null, 2));
  Deno.writeTextFileSync(join(root, "DESIGN.md"), "# Design\n\nCalm and plain.\n");
  Deno.writeTextFileSync(
    join(root, ".blueprint.json"),
    JSON.stringify({ version: 2, name: "Acme Shop", backend: false, apps }),
  );
  return root;
}

export const cleanup = (root: string) => Deno.removeSync(root, { recursive: true });
