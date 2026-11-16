// Demo project: when the studio runs without a project (inside the blueprint repo), it works on a throwaway
// copy under studio/.demo-project so the repo stays clean. The folder is gitignored and can be deleted any time.
import { join } from "node:path";

export function ensureDemoProject(studioDir: string): string {
  const root = join(studioDir, ".demo-project");
  Deno.mkdirSync(join(root, "design", "presets"), { recursive: true });
  const presets = join(studioDir, "..", "template", "design", "presets");
  try {
    for (const e of Deno.readDirSync(presets)) {
      if (e.name.endsWith(".json")) Deno.copyFileSync(join(presets, e.name), join(root, "design", "presets", e.name));
    }
  } catch {
    // The template may not be present when the studio is used standalone.
  }
  const clean = join(root, "design", "presets", "clean.json");
  const tokens = join(root, "design", "tokens.json");
  try {
    Deno.statSync(tokens);
  } catch {
    try {
      Deno.copyFileSync(clean, tokens);
    } catch {
      Deno.writeTextFileSync(
        tokens,
        JSON.stringify(
          {
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
            radius: { sm: 6, md: 10, lg: 14 },
            space: { "1": 4, "2": 8, "3": 12, "4": 16, "6": 24, "8": 32 },
            font: { sans: "Geist", display: "Geist", mono: "Geist Mono" },
          },
          null,
          2,
        ),
      );
    }
  }
  const md = join(root, "DESIGN.md");
  try {
    Deno.statSync(md);
  } catch {
    Deno.writeTextFileSync(
      md,
      "# Design direction\n\nAcme Shop: a small online shop's back office. Calm, plain and accountable. One accent colour (primary) for actions and focus only; everything else stays neutral. Numbers use tabular figures.\n\n## Palette\n\nSee design/tokens.json: primary, text, textMuted, surface, surfaceMuted, border, success, warning, danger.\n",
    );
  }
  const manifest = join(root, ".blueprint.json");
  try {
    Deno.statSync(manifest);
  } catch {
    Deno.writeTextFileSync(
      manifest,
      JSON.stringify(
        {
          version: 2,
          name: "Acme Shop",
          backend: false,
          apps: [{ stack: "web-spa", kind: "web", dir: "apps/web", name: "web" }, {
            stack: "mobile-rn",
            kind: "mobile",
            dir: "apps/mobile",
            name: "mobile",
          }, { stack: "mobile-flutter", kind: "mobile", dir: "apps/flutter", name: "flutter" }],
        },
        null,
        2,
      ),
    );
  }
  return root;
}
