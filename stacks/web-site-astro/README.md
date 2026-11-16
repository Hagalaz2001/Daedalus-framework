# web-site-astro: marketing site and blog (Astro, static)

Daedalus default website stack. Astro 7 with static output: every page is plain HTML, and only the interactive
parts ship JavaScript ("islands"). Styled with Tailwind v4 and the shared UI kit, themed from `design/tokens.json` so
it matches the app. Islands for this project use **{islands}** (`islands` option: `react` or `vue`, default `react`).

Pages: landing, pricing (billing toggle island, FAQ), about, journal (blog list and posts from a content collection),
contact (form island), privacy and terms (template text, have a lawyer review it), 404.

SEO: per-page title, description, canonical, Open Graph and Twitter tags, JSON-LD (Organization and WebSite everywhere,
BlogPosting and BreadcrumbList on posts, FAQPage on pricing), `sitemap-index.xml`, `robots.txt`, and Open Graph PNG images
generated at build time (`/og/site.png`, `/og/<post>.png`) in the brand colours and display font, semantic landmarks, skip link.

Need server features (forms handled on the server, auth, per-request rendering)? Use `web-site-next` instead, or add an
Astro adapter (`output: 'server'`, or `prerender = false` on one page) in `astro.config.mjs`.

## Run

From the project root (after `deno install`):

```sh
deno task dev:site                      # http://localhost:4321
deno task --cwd apps/site build         # static build into dist/
deno task --cwd apps/site preview       # serve the build
deno task --cwd apps/site check         # typecheck, lint, tests, build
```

Copy `.env.example` to `.env` and set `SITE_URL` to the real domain before shipping: canonical URLs, the sitemap and
Open Graph use it.

## Content

- Posts: add `src/content/blog/<slug>.md` with `title`, `description`, `date` (and optional `author`). The schema in
  `src/content.config.ts` fails the build, naming the file, when a field is missing.
- Plans, FAQs and feature copy: `src/lib/content.ts`. Site name, nav and links: `src/lib/site.ts`.
- The footer shows "All systems operational" when `PUBLIC_API_BASE_URL` is set and the backend's `/health` answers,
  through the generated client (`@app/api`). The backend must allow this site's origin (CORS).
- The contact form POSTs JSON to `PUBLIC_CONTACT_ENDPOINT` (a form service, a chat webhook or your backend). The OpenAPI
  contract has no contact operation; add one and call the generated client from `src/lib/contact.ts` to move it into the backend.

## Structure

```
src/
  pages/        routes (index, pricing, about, blog/, contact, privacy, terms, 404, og/, robots.txt)
  layouts/      Base.astro (head, SEO, JSON-LD, header, footer)
  components/   static .astro building blocks (no client JavaScript)
  islands/      the interactive parts: pricing toggle, contact form, mobile menu, theme toggle
  lib/          site config, SEO helpers, content, posts, contact logic (framework-free, unit-tested)
  content/blog/ Markdown posts
```

`src/islands/` and `src/lib/kit.ts` come from the chosen variant (`variants/react` or `variants/vue`); only `lib/kit.ts`
touches the UI kit from server-rendered code.

## Notes for Deno

- The build is verified under pure Deno (Astro 7.4, Vite 8). Deno resolves bare imports strictly, so the app's
  `package.json` lists the packages that the UI kit imports (`radix-ui`, `sonner`, `clsx`, ... or the Vue equivalents).
  Keep them when you upgrade the kit.
- `deno task typecheck` runs the Astro checker through `scripts/typecheck.mjs` against TypeScript 5.9 (dependency
  `typescript5`), because `astro check` cannot use the native TypeScript 7 compiler yet. Replace it with plain
  `astro check` when Astro supports it.
- Open Graph images are an SVG built from `design/tokens.json` (`src/lib/og.ts`) and rasterised by `@resvg/resvg-js`
  (MPL-2.0, build time only, prebuilt binaries for Windows, macOS and Linux). resvg renders text from TTF/OTF only, so
  `src/lib/woff.ts` converts the @fontsource WOFF file in memory. Titles are wrapped by a width estimate (up to four
  lines). Prefer static images? Delete `src/pages/og/` and put PNGs in `public/og/`.
