# web-shared: the web UI kits (`@app/ui`, `@app/ui-vue`)

Not selectable on its own. When a project includes a web stack, Daedalus copies the matching kit into the project as a
workspace package: `packages/ui` (React: `web-spa`, `web-site-next`, `web-site-astro` with React islands) or
`packages/ui-vue` (Vue: `web-spa-vue`, `web-site-astro` with Vue islands). Apps in one project share one look.

The React kit is a shadcn/ui-style kit; the Vue kit (`packages/ui-vue`, shadcn-vue patterns on Reka UI and `@lucide/vue`) has the
same components, classes and tokens, so both look identical. The React kit: components are plain source files you own and edit, built on Radix primitives, styled with
Tailwind v4 utilities that read design tokens, and icons from Lucide. See `THIRD_PARTY.md`.

## Components

Button, IconButton, Input, Textarea, Field and TextField (label, hint, error wiring), Select, Checkbox, Switch,
SegmentedControl, Card, ListRow, Dialog, Sheet, Toast (`Toaster`, `toast`), Tabs, Avatar, Badge, Skeleton, EmptyState,
ErrorState, PageHeader, AppShell (sidebar on desktop, tab bar on phones), ThemeToggle, and the `useTheme` hook.

Accessibility: visible focus ring, keyboard support from Radix, 44 px minimum targets (48 px for large buttons),
`aria-invalid` and described-by wiring in fields, reduced-motion respected, light and dark themes.

## Theming

`design/tokens.json` is the single source. `scripts/tokens/web.ts` (shared token core in `scripts/tokens/lib.ts`; the `tokens` step in each stack's
`stack.json`, run by `deno task sync`) writes `packages/ui/src/styles/tokens.css`: a Tailwind `@theme` block (colours,
radii, fonts), a dark-mode block from `colorDark`, and the font imports. Presets live in `design/presets/` (`clean`,
`editorial`, `playful`); copy one over `design/tokens.json` or use the generator's `--ui` flag.

An app's CSS wires the kit in with:

```css
@import "tailwindcss";
@import "../../../packages/ui/src/styles/tokens.css";
@import "../../../packages/ui/src/styles/index.css";
@source "../../../packages/ui/src";
```

Put `themeInitScript` in `<head>` (see `web-spa/index.html`) to avoid a flash of the wrong theme.

## Test

```sh
deno task --cwd packages/ui test        # Vitest + Testing Library + axe
deno task --cwd packages/ui typecheck
```

Next.js: modules that use hooks or Radix carry a `'use client'` directive, so the kit works from server components.

## Vue kit

`packages/ui-vue`: Button, IconButton, Input, Textarea, Field (slot prop `fieldProps`), TextField, Select, Checkbox, Switch,
SegmentedControl, Card parts, ListRow, Dialog and SheetContent, Toaster and `toast`, Tabs, Avatar, Badge, Skeleton,
SkeletonGroup, EmptyState, ErrorState, PageHeader, AppShell, ThemeToggle and `useTheme`. Tests: `deno task --cwd
packages/ui-vue test` (Vitest, Testing Library DOM, axe); `@app/ui-vue/testing` exports a small `render`, `screen` and
`expectNoA11yViolations` for app tests. Its type check runs vue-tsc against TypeScript 5.9 (`scripts/typecheck.mjs`).

The same `scripts/tokens/web.ts` writes `tokens.css` into every kit present, so Vue-only and React projects share one script.
