# Third-party notices

Daedalus is MIT licensed (see `LICENSE`). It includes, adapts or depends on the work below. Only licences that
allow MIT redistribution are accepted: MIT, Apache-2.0, BSD, ISC, CC0, CC-BY and OFL. Licences were read from the
package registry or the upstream repository when the entry was added.

## Copied or adapted into this repository

| Name | Licence | Source | What and where |
|---|---|---|---|
| Contributor Covenant 2.1 | CC-BY-4.0 | https://www.contributor-covenant.org/version/2/1/code_of_conduct/ | `CODE_OF_CONDUCT.md` (adapted: enforcement contact) |
| shadcn/ui | MIT | https://github.com/shadcn-ui/ui | Component structure and styling approach in `stacks/web-shared/packages/ui` (copy-in, themed by `design/tokens.json`) |
| React Native Reusables | MIT | https://github.com/founded-labs/react-native-reusables | Component structure in `stacks/mobile-rn/app/src/shared/ui` |

## Runtime dependencies named in stack manifests

Installed by Deno, Cargo or pub at generation time, not copied into this repository.

| Package | Licence | Used by |
|---|---|---|
| radix-ui (Radix UI primitives) | MIT | `web-shared` UI kit |
| lucide-react, lucide-react-native | ISC | web and React Native icons |
| class-variance-authority | Apache-2.0 | web and React Native components |
| clsx, tailwind-merge | MIT | web and React Native components |
| sonner | MIT | web toasts |
| nativewind | MIT | `mobile-rn` styling |
| @rn-primitives/* | MIT | `mobile-rn` accessible primitives |
| gpui-kit | Apache-2.0 | `desktop-gpui` |
| Hono, Drizzle ORM, Better Auth | MIT, Apache-2.0, MIT | backend |
| Flutter, Riverpod, Dio, Retrofit, swagger_parser | BSD-3-Clause, MIT, MIT, MIT, MIT | `mobile-flutter` |

Each package keeps its own licence text in the package it is installed from. Fonts named in the token presets
(Inter, JetBrains Mono, Source Sans 3, IBM Plex Mono) are SIL OFL 1.1 and are loaded by the apps at build time, not
bundled here.

## Fetched by packs when you apply them

Downloaded into the generated project by build files of the `systems` and `game` packs, not stored here.

| Name | Licence | Used by |
|---|---|---|
| Unity (ThrowTheSwitch) | MIT | `systems` pack, C tests |
| doctest | MIT | `systems` pack, C++ tests |
| Embassy | MIT or Apache-2.0 | `systems` pack, embedded Rust |
| cortex-m-rt | MIT or Apache-2.0 | `systems` pack, embedded Rust |
| setup-godot (GitHub Action) | MIT | `game` pack, optional CI step |

## Inspiration and optional external tools

- Spec Kit (GitHub) and OpenSpec (Fission AI), both MIT: the spec-driven flow in the `ai-kit` pack follows their ideas; no code is copied.
- Optional tools the packs can call when installed, not bundled: gitleaks (MIT), syft (Apache-2.0), nasm (BSD-2-Clause).
- The SAST rules in the `ai-kit` pack are written for Daedalus; rules from the Semgrep registry are not redistributed.

## Not bundled

Third-party AI design skills are not part of this repository. `template/skills-lock.json` lists the sources a team
may install; each carries its own licence, which the installer must check.

## Adding an entry

Record name, URL, licence, what was copied and where, in the first table, in the same change that copies it.
`deno task oss:check` fails when a folder carrying its own `LICENSE`, or named `vendor`, `third_party` or
`components/ui`, is not mentioned here.

## material-color-utilities

- Source: https://github.com/material-foundation/material-color-utilities (npm `@material/material-color-utilities` 0.4.0)
- Licence: Apache-2.0, Copyright Google LLC (full text in `studio/shared/design/vendor/LICENSE-material-color-utilities.txt`)
- Used in: `studio/shared/design/vendor/material-color-utilities.js` (bundled because the package's extensionless ESM imports don't resolve under Deno)
