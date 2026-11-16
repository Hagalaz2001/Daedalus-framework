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

## CI and security tools run by the generated pipeline

Invoked from GitHub Actions or GitLab CI, pinned by commit SHA or exact version, never copied into this repository or a
generated project (see `template/docs/DEVSECOPS.md`).

| Name | Licence | Used for |
|---|---|---|
| gitleaks | MIT | secret scanning |
| Trivy (and aquasecurity/trivy-action) | Apache-2.0 | container, Dockerfile and filesystem scan |
| syft (and anchore/sbom-action) | Apache-2.0 | SBOM |
| cosign, sigstore/cosign-installer | Apache-2.0 | keyless image signing |
| github/codeql-action | MIT (the CodeQL CLI it downloads: GitHub CodeQL terms, free for public repositories) | code scanning |
| actions/dependency-review-action, actions/attest-build-provenance, actions/checkout, actions/upload-artifact, actions/download-artifact | MIT | CI plumbing |
| docker/setup-buildx-action, docker/build-push-action, docker/login-action | Apache-2.0 | image build and push |
| denoland/setup-deno, subosito/flutter-action | MIT | toolchain setup |
| actionlint | MIT | optional local workflow validation |

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

## Daedalus Studio dependencies

Installed by Deno from `studio/deno.json` (exact versions pinned), not copied into this repository.

| Package | Licence | Used for |
|---|---|---|
| @anthropic-ai/sdk | Apache-2.0 | Default model provider |
| @google/stitch-sdk | Apache-2.0 | Optional Google Stitch engine (bring your own key) |
| playwright-core | Apache-2.0 | Screenshots with an installed Chrome or Edge |
| cheerio | MIT | Server-side HTML sanitiser and patching |
| react, react-dom, vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite | MIT | Studio UI |
| lucide-react | ISC | Studio icons |
| @std/assert, @std/dotenv | MIT | Deno standard library |

Prior art reviewed for ideas, no code copied: OpenUI (Apache-2.0), Onlook (Apache-2.0), Excalidraw (MIT), react-live
(MIT), Sandpack (Apache-2.0). tldraw is under its own non-OSI licence and is not used.

## Local AI (not bundled)

Daedalus Studio can use [Lemonade](https://github.com/lemonade-sdk/lemonade) (Apache-2.0, licence read from its
repository on 2026-11-17) as a local model server. It is installed by the user and called over HTTP; none of its code
is included. The studio can ask Lemonade to download these models from Hugging Face on the user's request; they are
not stored here: Qwen3.5-4B and Qwen3.8-27B (Apache-2.0, Qwen team; GGUF conversions by bartowski and Unsloth) and
MiMo-V2.6-Distill-Qwen-9B (MIT, Xiaomi; GGUF conversion by bartowski). The speed tip and model sizes in
`docs/LOCAL-AI.md` come from the maintainer's own measurements.
