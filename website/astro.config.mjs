import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";

const repo = "https://github.com/Hagalaz2001/Daedalus-framework";

// Static output for GitHub Pages at https://hagalaz2001.github.io/Daedalus-framework/.
export default defineConfig({
  site: "https://hagalaz2001.github.io",
  base: "/Daedalus-framework",
  trailingSlash: "always",
  integrations: [
    mermaid({ theme: "neutral", autoTheme: true }),
    starlight({
      title: "Daedalus",
      description: "The AI-assisted framework for building web, mobile and desktop apps from one contract and one set of design tokens.",
      logo: { src: "./src/assets/logo.svg", alt: "" },
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: repo }],
      customCss: ["./src/styles/brand.css", "./src/styles/starlight.css"],
      lastUpdated: false,
      disable404Route: true,
      head: [
        { tag: "meta", attrs: { property: "og:image", content: "https://hagalaz2001.github.io/Daedalus-framework/og.png" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      ],
      sidebar: [
        { label: "Showcase", link: "/showcase/", attrs: { class: "sidebar-showcase" } },
        { label: "Getting started", items: [{ autogenerate: { directory: "getting-started" } }] },
        { label: "Concepts", items: [{ autogenerate: { directory: "concepts" } }] },
        {
          label: "Stacks",
          items: [
            { label: "Web", items: ["stacks/web-spa", "stacks/web-spa-vue", "stacks/web-site-astro", "stacks/web-site-next", "stacks/web-shared"] },
            { label: "Mobile", items: ["stacks/mobile-flutter", "stacks/mobile-rn"] },
            { label: "Desktop", items: ["stacks/desktop-gpui", "stacks/desktop-tauri"] },
            { label: "Backend and data", items: ["stacks/backend", "stacks/database", "stacks/operations"] },
          ],
        },
        { label: "Modules", items: [{ autogenerate: { directory: "modules" } }] },
        { label: "Packs", items: [{ autogenerate: { directory: "packs" } }] },
        { label: "Daedalus Studio", items: [{ autogenerate: { directory: "studio" } }] },
        { label: "AI workflow and responsibility", items: [{ autogenerate: { directory: "ai" } }] },
        { label: "CLI and MCP reference", items: [{ autogenerate: { directory: "reference" } }] },
        { label: "Contributing", items: [{ autogenerate: { directory: "contributing" } }] },
      ],
    }),
  ],
});
