# Changelog

Format: newest first. Versions follow semantic versioning once the first tag is cut.

## 2.0.0 (unreleased)

Pick-your-stack framework. The single fixed template became a base plus stacks.

### Added

- `stacks/`: `web-spa`, `web-spa-vue`, `web-site-astro` (default site), `web-site-next` (opt-in), `mobile-flutter`, `mobile-rn`, `desktop-gpui`, `desktop-tauri`, each described by a
  `stack.json` (`id`, `kind`, `defaultAppDir`, `workspaceMember`, `packages`, `tasks`, `check`, `sync`, `tokens`,
  `replace`, `requires`). `web-shared` holds the UI kit both web stacks copy in.
- Generator in TypeScript on Deno: `deno run -A new-project.ts <dir> --web --mobile --desktop --backend --ui ...`,
  interactive when flags are missing, with input validation and bundle-id, name and display-name placeholders.
- `.blueprint.json` manifest per project; `deno task sync` and `deno task check` read it, so they are stack-aware.
- `deno task add-app <stack> <name>` for every stack, `deno task add-module`, `deno task studio` (bridge to the
  Daedalus checkout), and the `daedalus` command (`cli.ts`).
- `deno task lint:boundaries`: fails when a feature imports another feature's internals or shared code imports a
  feature (TypeScript and Dart). `deno task lint:deno-only`: fails on npm, pnpm or yarn lockfiles and commands.
- `docs/ARCHITECTURE.md`, `docs/AI-WORKFLOW.md`, `docs/adr/` (template and ADR 0001), `CONTRIBUTING.md` in generated
  projects.
- UI presets `clean` and `editorial` (`--ui`), selected into `design/tokens.json`.
- Open-source repository files: LICENSE (MIT), THIRD_PARTY_NOTICES.md, CODE_OF_CONDUCT.md, SECURITY.md, issue and
  pull request templates, CI that runs the unit tests and generates and checks a project per combination.
- `deno audit` in `deno task check` of generated projects, of this repository and in CI; exact-version pinning for
  `next`, `astro`, `react`, `react-dom`, `vue`, `hono`, `better-auth` enforced by `lint:deno-only`.
- Installable tool: JSR package `@daedalus-framework/cli`, single-file binaries (Windows x64, macOS arm64 and x64, Linux x64 and arm64), `install.ps1` and `install.sh` (user-level, checksum-verified), `daedalus --version` and `daedalus upgrade`. The CLI downloads the assets of its own version from the GitHub release (SHA-256 checked against `checksums.txt` and a checksum built into the CLI) into a per-user cache; a checkout still works.
- `.github/workflows/release.yml` (tag to check, assets, binaries, SBOM, provenance, GitHub Release, JSR through OIDC), `deno task release:prepare`, `docs/RELEASING.md`.
- `deno task oss:check`: fails on private names, personal paths, emails, unlisted third-party folders and npm usage.

### Changed

- The Flutter app and `app_core` moved from `template/` to `stacks/mobile-flutter/`; features expose a barrel file.
- Generated scripts are TypeScript: `scripts/sync.ts`, `scripts/check.ts`; per-stack token generators replace the
  single `gen-tokens` script.
- The backend Dockerfile copies the whole workspace so the lockfile always matches.
- AGENTS.md, CLAUDE.md and GEMINI.md rewritten around the contract, tokens, boundaries and generator.
- CATALOG.md no longer lists tools by installation status on a particular machine.

### Removed

- `new-project.mjs`, the Node-based root scripts, `package.json` at the project root, and the bundled third-party
  design skills (licences differ per skill). `skills-lock.json` still lists the sources; see `.agents/README.md`.
- Machine setup scripts and team notes that assumed one person's computer.

## 1.0.0

First version: contract-first layout (OpenAPI to TypeScript and Dart clients), an example `notes` feature end to end,
Hono + Drizzle + Better Auth backend, React web app, Flutter app, design tokens, project plan, QA and report
documents, and Deno as toolchain.
