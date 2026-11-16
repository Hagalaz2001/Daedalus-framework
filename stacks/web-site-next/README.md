# web-site-next: marketing site and blog (Next.js)

Daedalus stack for a public, search-friendly website: Next.js App Router (React + TypeScript, statically generated),
Tailwind v4 and the shared UI kit (`@app/ui`), themed from `design/tokens.json` so it matches the app.
It runs under pure Deno: `deno install`, `dev`, `build` and `start` all work (verified with Next.js 16 and Turbopack).

Pages: landing, pricing (billing toggle, FAQ), about, journal (blog list and posts from Markdown), contact form,
privacy and terms (template text, have a lawyer review it), 404.

SEO: Metadata API per page (title, canonical, Open Graph, Twitter), generated Open Graph images (site and each post),
`sitemap.xml`, `robots.txt`, JSON-LD (Organization and WebSite on every page, BlogPosting and BreadcrumbList on posts,
FAQPage on pricing), semantic landmarks, skip link.

## Run

From the project root (after `deno install`):

```sh
deno task dev:site-next                       # http://localhost:3000
deno task --cwd apps/site build            # static build
deno task --cwd apps/site start            # serve the build
deno task --cwd apps/site check            # typecheck, lint, tests, build
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the real domain before shipping: canonical URLs,
the sitemap and Open Graph use it.

`next build` under Deno prints an `ERR_IPC_DISCONNECTED` message after finishing; the build itself succeeds (exit code 0).

## Content

- Posts: add `content/blog/<slug>.md` with `title`, `description`, `date` (and optional `author`) front matter.
  Markdown renders to React elements; raw HTML is not allowed through.
- Copy and plans live in `src/features/marketing/model/content.ts`; the site name and nav in `src/shared/lib/site.ts`.
- The footer shows backend status using the generated client (`@app/api`, `GET /health`) when the backend is reachable.
- The contact form posts to `CONTACT_WEBHOOK_URL` when set, otherwise it only logs. The OpenAPI contract has no contact
  operation; add one and call the generated client from `features/contact/state/sendMessage.ts` to move it into the backend.

## Structure

```
src/
  app/            routes, metadata, sitemap, robots, Open Graph images (thin: compose features)
  features/<x>/   marketing, blog, contact: ui / state / data / model, public entry is index.ts
  shared/         lib (site config, SEO helpers, status), ui (header, footer, container, JsonLd)
content/blog/     Markdown posts
```

Rules are the same as `web-spa`: features import each other only through `index.ts` (`deno task lint:boundaries`), no hard-coded
colours (use token utilities), no hand-written backend `fetch`.

## Why Next.js, and the TypeScript pin

Next.js needed no workaround under Deno. This app pins TypeScript 5.9 because Next's build step uses the TypeScript
JavaScript API, which the native TypeScript 7 compiler used by other stacks does not provide.
