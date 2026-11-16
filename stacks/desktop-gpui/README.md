# desktop-gpui: native desktop app in Rust

A desktop app written entirely in Rust on [GPUI](https://www.gpui.rs) (the UI framework behind the Zed editor) and
[GPUI Component](https://github.com/longbridge/gpui-kit) (shadcn-style components). No webview, no Node, no Electron.
It talks to the Daedalus backend through a client generated from `contracts/openapi.yaml`.

Status: built and run on Windows 10/11 (x86_64, MSVC). The code uses no Windows-only APIs outside the build script's
icon embedding, so macOS and Linux should compile, but they have **not** been built or run here.

## When to pick this stack (and when not)

| Pick `desktop-gpui` when | Pick `desktop-tauri` when |
|---|---|
| the app is a long-lived tool and idle memory and startup time matter | the product shares UI, components or logic with the website |
| you want native-feeling rendering and one language end to end | you need to ship fast and your team writes React |
| you are fine learning GPUI (younger ecosystem, fewer examples, API still moving) | you need web content, rich text or a mature accessibility story today |

## Generate

```
deno run -A new-project.ts my-app --name "Acme Notes" --id com.example.notes --desktop gpui
```

Requirements: Rust (stable, edition 2024, tested with 1.99), and on Windows the MSVC build tools with a Windows SDK.
The first build compiles GPUI and takes a few minutes; later builds are incremental. Set `CARGO_TARGET_DIR` to a folder
outside the repo to keep build output (several GB) out of the project and to share it between projects.

```
cd apps/desktop
cargo run -p app                # debug build
cargo build --release -p app    # optimised build (see "Release profile")
cargo run -p app -- --open notes/new   # start on a screen (deep link: dashboard, notes, notes/<id>, settings, profile)
```

## Layout

```
apps/desktop/
  Cargo.toml                  workspace, exact pin of gpui-kit, release profile
  crates/
    core/        (app-core)   domain types and rules: Note, Route, filters, validation. No UI, no I/O.
    api/         (app-api)    client generated from contracts/openapi.yaml at build time (progenitor) + sign-in
    storage/     (app-storage) settings in redb, session token in the OS credential store
    services/    (app-services) wires api + storage; session restore, sign in/out
    ui/          (app-ui)     tokens.g.rs, theme, fonts, shared components, app shell
    features/
      auth/ dashboard/ notes/ profile/ settings/    (feature-*)  state (pure) <- data <- ui views
    app/         (app)        window, menus, shortcuts, single instance, routing, icon
  xtask/                      `cargo xtask tokens` and `cargo xtask boundaries`
  Packager.toml               Windows installer recipe
```

Layers inside a feature: `ui` (GPUI views) -> `state` (plain structs, unit tested) -> `data` (calls `services`) -> `app-core`.
Data comes only from the generated client; there is no hand-written HTTP to the backend except Better Auth's
`/api/auth/sign-in/email` and `/sign-out`, which are not part of the contract.

### Boundaries (enforced)

`cargo xtask boundaries` reads every crate's `[dependencies]` and fails when a rule is broken. It runs in `deno task check`.

- `app-core` depends on no workspace crate.
- `app-api`, `app-storage`, `app-ui` depend on `app-core` only.
- `app-services` depends on core, api and storage.
- `feature-*` may use core, api, storage, ui and services, never another feature.
- Only `app` depends on the feature crates.

Each feature exposes only its views and events from `lib.rs`; `state`, `data` and `ui` modules are private to the crate.

## Design tokens

`design/tokens.json` (and the `--ui` preset you chose) is the single source. `cargo xtask tokens` writes
`crates/ui/src/tokens.g.rs` (light and dark palettes, radii, spacing, font names). The dark palette is derived from the light
one unless the preset has `colorDark`. `app_ui::theme::apply` maps the palette onto GPUI Component's theme at startup and
whenever the user changes the setting. `deno task sync` / the generator runs the tokens step for you.

Fonts: Geist (OFL) is bundled in `crates/ui/assets/fonts`. A preset that names another family needs its font files added
there and `fonts::register` extended; until then the bundled family is used.

## Screens and components

Screens: sign in, dashboard, notes (search, time filter, sort), note detail, create/edit form, settings (light/dark/system,
confirm-before-delete, server address), profile (sign out), not found.
Components: GPUI Component's button, input, textarea, select, switch, tabs, avatar, tag, skeleton, empty state, alert dialog,
notification toasts, sidebar and title bar, plus `app_ui::components` (page header, card, field, list row, empty state,
error state, skeleton rows) and `app_ui::shell`.

Keyboard first: `Ctrl+1` dashboard, `Ctrl+2` notes, `Ctrl+N` new note, `Ctrl+3` profile, `Ctrl+,` settings,
`Ctrl+Shift+L` toggle theme, `Ctrl+Enter` save in the form, `Enter` submits sign in, `Ctrl+Q` quit (`Cmd` on macOS).
List rows and controls are focusable (Tab / Shift+Tab). Accessibility comes from GPUI Component's AccessKit integration;
it has not been audited with a screen reader here.

## Checks

`deno task check` runs, in `apps/desktop`: `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`,
`cargo test --workspace`, `cargo xtask boundaries`. Tests cover the domain rules, the tokens generator, the boundaries
checker, the settings store, the contract mapping of the generated client, and the pure state of each feature. GPUI view
rendering is not covered by automated tests (GPUI Kit offers a headless test harness behind its `test-support` feature; not wired up yet).

## Release profile and packaging

`[profile.release]`: `lto = "fat"`, `codegen-units = 1`, `opt-level = 3`, `strip = "symbols"`, `panic = "abort"`.
`panic = "abort"` is safe here: nothing relies on unwinding (no `catch_unwind`; the tokio runtime is private to `app-api`).

Windows installer: [cargo-packager](https://github.com/crabnebula-dev/cargo-packager) (MIT/Apache-2.0), NSIS target, per-user install:

```
cargo install cargo-packager --locked
cargo packager --release        # writes dist/<name>_<version>_x64-setup.exe
```

The installer is **not signed**; SmartScreen will warn until you sign it. The icon is `crates/app/assets/icon.ico` (embedded
in the exe by `build.rs`) and `icon.png`; replace both with your own.

Auto-update is a hook, not a feature: `cargo-packager-updater` can check a signed manifest you host. Add it to `crates/app` and call
it from `AppRoot::new`. Nothing in the app phones home.

## Backend and security notes

- The server address is a setting (default `http://localhost:8787`). Use `https://` in production; the HTTP client uses the
  platform TLS stack (Schannel on Windows, so Linux builds need OpenSSL development headers).
- The session bearer token is stored in the OS credential store (Windows Credential Manager, macOS Keychain, Secret Service),
  never in the settings file. Settings (theme, server, confirm-delete) live in `%APPDATA%/<bundle id>/settings.redb`.
- One instance at a time (named mutex / lock). A second launch exits; focusing the first window is not implemented.

## Limits (read before relying on it)

- Notes are loaded in full (pages of 100, at most 20 pages) and filtered locally; paginate on demand for large data sets.
- The profile screen offers sign out only; the contract has no account-deletion operation. Sign up, forgot password and
  onboarding are not in this stack (create the account in the web or mobile app).
- Native application menus appear on macOS only (GPUI renders no menu bar on Windows); the same actions are shortcuts.
- Problem responses from the server are mapped to short messages by status code, not by their `detail` text.
- GPUI Kit pulls a GPUI snapshot published as `gpui-pre`. The version is pinned exactly in `Cargo.toml`; upgrade deliberately and
  rebuild, expect API changes between releases.

## Measured on the build machine

Windows 10, Rust 1.99.1, release profile above.

| | desktop-gpui (measured) | typical Electron hello-world (commonly reported, not measured here) |
|---|---|---|
| Release exe, stripped | 18.2 MB (`app.exe`, icon embedded) | the Electron runtime alone is roughly 150 MB unpacked |
| NSIS installer | 6.7 MB (`cargo packager`, not signed, built but not run) | usually 70-100 MB |
| Idle memory (Working Set) | **not measured yet** | usually 100-200 MB summed over its processes |
| Cold build (release, fat LTO) | about 12 min on first build, about 8 min to relink after a change | n/a |
| Build output folder | about 12 GB for debug + test + release together | n/a |

Idle memory and screenshots of the screens are pending: they need the app to open a window, which was not done after the
maintainer asked that no window be opened without approval. Measure with
`Get-Process app | Select WorkingSet64` after the dashboard has loaded and the process has been idle for a minute.
