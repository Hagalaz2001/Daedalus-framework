# Third-party notices: web-site-astro

The island components come from the shared kits; see `stacks/web-shared/THIRD_PARTY.md`.

| What | Licence | Where |
|---|---|---|
| Lucide icon paths (arrow-right, check, chevron-down, zap, keyboard, download) inlined as SVG | ISC | `stacks/web-site-astro/src/components/Icon.astro` |

Sample blog posts and copy are original. Installed dependencies: astro, @astrojs/react, @astrojs/vue, @astrojs/sitemap,
Vue, React, Tailwind CSS (MIT); @fontsource/* font packages (fonts: SIL OFL 1.1, packaging MIT).

Default dependencies for the Open Graph image script (`deno task og:default`, dev only): @napi-rs/canvas (MIT; bundles Skia, BSD-3-Clause).

**Opt-in only** (`deno task og:per-page`, not installed by default): @resvg/resvg-js, **MPL-2.0**, added to a project only when the
owner runs that task; used at build time to rasterise per-page Open Graph images and not redistributed in the site output.
