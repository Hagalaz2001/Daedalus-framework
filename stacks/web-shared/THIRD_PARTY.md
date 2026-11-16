# Third-party notices: web UI kit (`packages/ui`)

For the repository-level `THIRD_PARTY_NOTICES.md`. Versions are pinned in `packages/ui/package.json`.

## Adapted source patterns

| What | Source | Licence | Where |
|---|---|---|---|
| Component recipes: `cva` variant buttons with `Slot`, Radix-composed Dialog/Sheet, Select, Tabs, Checkbox, Switch, Avatar, Card structure, Badge and Skeleton styling, the `cn` helper, the Sonner wrapper | [shadcn/ui](https://github.com/shadcn-ui/ui) patterns and structure (Copyright shadcn) | MIT | `stacks/web-shared/packages/ui/src/components/{button,input,select,toggles,card,dialog,toast,tabs,display}.tsx`, `src/lib/cn.ts` |

No file was copied verbatim from shadcn/ui or generated with its CLI: the components were written for Daedalus following the
shadcn/ui approach (copy-in components on Radix, `cva`, `tailwind-merge`) and re-themed to design tokens. Components not
in shadcn/ui (`AppShell`, `ListRow`, `SegmentedControl`, `EmptyState`, `ErrorState`, `PageHeader`, `Field`, theme hook) are original.

## Runtime dependencies (installed, not vendored)

| Package | Licence |
|---|---|
| radix-ui (Radix Primitives) | MIT |
| lucide-react (icons) | ISC |
| sonner (toasts) | MIT |
| class-variance-authority | Apache-2.0 |
| clsx, tailwind-merge | MIT |
| react, react-dom | MIT |
| @fontsource-variable/* (Geist, Geist Mono, Fraunces, Hanken Grotesk, Bricolage Grotesque, Nunito, JetBrains Mono) | font files: SIL OFL 1.1; packaging: MIT |

Dev only: vitest, jsdom, Testing Library (MIT), axe-core (MPL-2.0, used in tests only, not shipped).
