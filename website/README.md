# Daedalus website

Landing page, documentation and showcase for Daedalus, built with [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build) (both MIT) and published to GitHub Pages at
`https://hagalaz2001.github.io/Daedalus-framework/`. Pure Deno: no npm, pnpm or yarn.

## Commands (run in `website/`)

| Command | What it does |
|---|---|
| `deno install` | Install dependencies (exact versions, see `package.json`) |
| `deno task dev` | Sync docs and screenshots, then start the dev server |
| `deno task build` | Sync, then build static output to `dist/` |
| `deno task preview` | Serve `dist/` locally at `http://localhost:4321/Daedalus-framework/` |
| `deno task sync` | Regenerate the docs pages only |
| `deno task showcase` | Re-collect screenshots only |
| `deno task test` | Unit tests for the sync helpers |

## Content is generated, never copied by hand

`scripts/sync-docs.ts` turns the repository's own documents into Starlight pages (`src/content/docs/`, git-ignored):
`README.md` (split into Introduction, Install, Choosing a stack, Stack manifest), `docs/*.md`, `template/docs/*.md`,
`template/docs/diagrams/*.md`, `DISCLAIMER.md`, `packs/**/README.md`, every stack README, plus catalogs built from
`stack.json`, `module.json`, `pack.json` and the design presets. Links between documents are rewritten to site pages
or to GitHub; images are copied and optimised. Edit the source document, not the generated page: every page has an
"Edit page" link to its source. To add a page or change the sidebar, edit the page list in `scripts/sync-docs.ts` and
`sidebar` in `astro.config.mjs`.

Mermaid diagrams render in the browser through `astro-mermaid` and follow the light/dark theme.

## Showcase

`deno task showcase` (`scripts/showcase.ts`) scans `stacks/*/docs/screenshots/` and `docs/studio/` for PNGs named
`<screen>[-<width>]-light.png` and `...-dark.png`, copies them to `src/assets/showcase/` and writes
`src/data/generated/showcase.json`. Astro optimises them to responsive WebP; the gallery has a lightbox with a
light/dark switch. A stack without screenshots shows a "coming soon" card (never a placeholder image). Run the task
again, rebuild, and new screens appear. Edit `SOURCES` and `CAPTIONS` in the script to change grouping or captions.

## Deploying (GitHub Pages)

`.github/workflows/pages.yml` builds and deploys on every push to `main` that touches `website/` or any document the site
is generated from. **One-time setup by the repository owner:** Settings > Pages > Build and deployment > Source =
**GitHub Actions**. If the repository is renamed or moved, update `site` and `base` in `astro.config.mjs`, `GITHUB`/`BASE`
in `scripts/sync-docs.ts`, and `REPO`/`SITE` in `src/lib/site.ts`.

## Quality

Lighthouse (desktop-sized headless run, local preview): performance 96 to 99, accessibility 100, best practices 100,
SEO 100. Each page has a title, description, canonical URL, Open Graph image (`public/og.png`), sitemap (Starlight) and a 404.
`docs-screenshots/` holds reference screenshots at 390 and 1440 px in light and dark.

## Licences

Astro, Starlight, astro-mermaid and Mermaid: MIT. Fonts Fraunces, Geist and Geist Mono via Fontsource: SIL OFL 1.1.
The screenshots are produced by the stacks in this repository.
