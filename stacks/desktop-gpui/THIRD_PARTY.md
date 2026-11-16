# Third-party items in stacks/desktop-gpui

Items copied into the repository (for the notices file) and notable dependencies pulled by Cargo.

## Copied in

| Item | URL | Licence | What was copied | Where |
|---|---|---|---|---|
| Geist font (Regular, Medium, SemiBold) | https://github.com/vercel/geist-font | SIL OFL 1.1 | `Geist-Regular.ttf`, `Geist-Medium.ttf`, `Geist-SemiBold.ttf` and the licence text | `app/crates/ui/assets/fonts/` |

The app icon (`app/crates/app/assets/icon.ico`, `icon.png`) was drawn for this project and has no third-party origin.

## Dependencies (not copied)

| Crate | Licence | Role |
|---|---|---|
| `gpui-kit` 0.10.0 (re-exports `gpui`, `gpui-component`, Lucide icons) | Apache-2.0 | UI framework and component library (Zed's GPUI, longbridge's GPUI Component) |
| Lucide icons (via `gpui-kit-assets`) | ISC | Icons |
| `progenitor` / `progenitor-client` 0.15.1 | MPL-2.0 | Generates the API client from `contracts/openapi.yaml` at build time. Unmodified dependency; MPL applies to its own files only |
| `redb` | MIT or Apache-2.0 | Local settings store |
| `keyring` | MIT or Apache-2.0 | OS credential store for the session token |
| `reqwest`, `tokio`, `serde`, `chrono`, `uuid`, `single-instance` | MIT or Apache-2.0 | HTTP, runtime, data, single-instance lock |
| `winresource` (Windows build only) | MIT | Embeds the icon in the exe |
| `cargo-packager` (tool, not a dependency) | MIT or Apache-2.0 | Builds the Windows installer |

Run `cargo tree --workspace --edges normal` or `cargo deny check licenses` (if you use cargo-deny) to audit the full tree.
