# Third-party notices: web UI kits (`packages/ui`, `packages/ui-vue`)

For the repository-level `THIRD_PARTY_NOTICES.md`. Versions are pinned in each kit's `package.json`.

## Adapted source patterns

| What | Source | Licence | Where |
|---|---|---|---|
| React kit: component recipes (`cva` variant buttons with `Slot`, Radix-composed Dialog/Sheet, Select, Tabs, Checkbox, Switch, Avatar, Card structure, Badge and Skeleton styling, the `cn` helper, the Sonner wrapper) | [shadcn/ui](https://github.com/shadcn-ui/ui) patterns and structure (Copyright shadcn) | MIT | `stacks/web-shared/packages/ui/src/components/{button,input,select,toggles,card,dialog,toast,tabs,display}.tsx`, `src/lib/cn.ts` |
| Vue kit: the same recipes expressed as Vue components on Reka UI | [shadcn-vue](https://github.com/unovue/shadcn-vue) patterns and structure (Copyright shadcn-vue contributors) | MIT | `stacks/web-shared/packages/ui-vue/src/components/*.vue`, `src/components/{button-variants,parts,Tabs,control}.ts`, `src/lib/{cn,styled}.ts` |

No file was copied verbatim from shadcn/ui or shadcn-vue, or generated with their CLIs: the components were written for
Daedalus following their approach (copy-in components on headless primitives, `cva`, `tailwind-merge`) and re-themed to
design tokens. Components not in those projects (`AppShell`, `ListRow`, `SegmentedControl`, `EmptyState`, `ErrorState`,
`PageHeader`, `Field`, the theme hook) are original.

## Runtime dependencies (installed, not vendored)

| Package | Licence |
|---|---|
| radix-ui (Radix Primitives, React kit) | MIT |
| reka-ui (headless primitives, Vue kit) | MIT |
| lucide-react, @lucide/vue (icons) | ISC |
| sonner (React toasts), vue-sonner (Vue toasts) | MIT |
| class-variance-authority | Apache-2.0 |
| clsx, tailwind-merge | MIT |
| react, react-dom, vue | MIT |
| @fontsource-variable/* (Geist, Geist Mono, Fraunces, Hanken Grotesk, Bricolage Grotesque, Nunito, JetBrains Mono) | font files: SIL OFL 1.1; packaging: MIT |

Dev only: vitest, jsdom, Testing Library DOM, React and user-event (MIT), vue-tsc, @vitejs/plugin-vue (MIT),
axe-core (MPL-2.0, used in tests only, not shipped).
