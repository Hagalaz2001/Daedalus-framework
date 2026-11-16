# Third-party code in the React Native stack

Everything here is MIT, ISC or Apache-2.0 and may be redistributed under Daedalus's MIT licence. The core agent folds
this list into the repository's `THIRD_PARTY_NOTICES.md`.

## Copied into the app (source files)

Source: **React Native Reusables**, <https://github.com/founded-labs/react-native-reusables>, MIT,
copyright Founded Labs. Copied from `packages/registry/src/nativewind` (NativeWind variant, commit on `main`,
November 2026), then adapted: import paths, 48 dp touch sizes, and a header comment in each file.

| File in `app/src/shared/ui/primitives/` | Reusables source |
|---|---|
| `text.tsx` | `components/ui/text.tsx` |
| `button.tsx` | `components/ui/button.tsx` (sizes raised to 48 dp) |
| `input.tsx` | `components/ui/input.tsx` (height 48 dp) |
| `card.tsx` | `components/ui/card.tsx` |
| `avatar.tsx` | `components/ui/avatar.tsx` |
| `skeleton.tsx` | `components/ui/skeleton.tsx` |
| `checkbox.tsx` | `components/ui/checkbox.tsx` |
| `switch.tsx` | `components/ui/switch.tsx` |
| `tabs.tsx` | `components/ui/tabs.tsx` (height 48 dp) |
| `alert-dialog.tsx` | `components/ui/alert-dialog.tsx` |
| `icon.tsx` | `components/ui/icon.tsx` |
| `native-only-animated-view.tsx` | `components/ui/native-only-animated-view.tsx` |
| `../../lib/cn.ts` | `lib/utils.ts` |

The wrappers one level up (`Button.tsx`, `Input.tsx`, `Select.tsx`, `Overlay.tsx`, `Toast.tsx`, `States.tsx`,
`Screen.tsx`, ...) and every screen are original to this project.

## Dependencies (installed, not copied)

| Package | Pinned | Licence | Used for |
|---|---|---|---|
| nativewind | 4.2.7 | MIT | Tailwind classes in React Native |
| tailwindcss | 3.4.19 | MIT | NativeWind 4 needs Tailwind 3 |
| tailwindcss-animate | 1.0.7 | MIT | animation utilities used by Reusables |
| @rn-primitives/* (alert-dialog, avatar, checkbox, portal, slot, switch, tabs) | 1.5.2 (portal 1.5.3) | MIT | accessible primitives under Reusables |
| lucide-react-native | 1.73.0 | ISC | icons |
| class-variance-authority | 0.7.1 | Apache-2.0 | component variants |
| clsx, tailwind-merge | 2.1.1, 3.5.0 | MIT | class merging |
| react-native-reanimated, react-native-worklets, react-native-svg | 4.7.1, 0.13.0, 15.16.0 | MIT | animation and SVG (Reusables, Lucide) |
| Expo SDK 58 packages, Expo Router | 58.x | MIT | app runtime and navigation |
| @tanstack/react-query | 5.107.1 | MIT | server state |
| better-auth | 1.7.25 | MIT | sign in with bearer tokens |

Moderate advisories reported by `deno audit` (glob, minimatch) come from Jest and Expo's own dependencies; they
are development-time only and have no fix reachable through Deno today (no override mechanism).
