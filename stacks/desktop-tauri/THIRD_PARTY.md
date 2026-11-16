# Third-party notices: desktop-tauri

No third-party source files are copied into this stack. The UI components come from the shared kit; see
`stacks/web-shared/THIRD_PARTY.md` (shadcn/ui-style patterns, MIT). The screens are adapted from `stacks/web-spa`
(same project, MIT). The app icon (a blue rounded square with white note lines) is original to this repository
(MIT); `cargo tauri icon` only resized it.

| Name | URL | Licence | What | Where |
|---|---|---|---|---|
| Tauri (`tauri`, `tauri-build`, `tauri-cli`) | https://github.com/tauri-apps/tauri | MIT or Apache-2.0 | App shell, bundler | `app/src-tauri/Cargo.toml` (crates), `cargo install tauri-cli` (tool) |
| tauri-plugin-http | https://github.com/tauri-apps/plugins-workspace | MIT or Apache-2.0 | Rust-side HTTP client for the webview | `app/src-tauri/Cargo.toml`, `@tauri-apps/plugin-http` in `app/package.json` |
| tauri-plugin-single-instance | https://github.com/tauri-apps/plugins-workspace | MIT or Apache-2.0 | One running instance, focuses the window | `app/src-tauri/Cargo.toml` |
| tauri-plugin-window-state | https://github.com/tauri-apps/plugins-workspace | MIT or Apache-2.0 | Remembers window size and position | `app/src-tauri/Cargo.toml` |
| keyring | https://github.com/open-source-cooperative/keyring-rs | MIT or Apache-2.0 | OS credential store for the session token | `app/src-tauri/Cargo.toml` |
| serde, serde_json | https://serde.rs | MIT or Apache-2.0 | Settings file | `app/src-tauri/Cargo.toml` |
| @tauri-apps/api | https://github.com/tauri-apps/tauri | MIT or Apache-2.0 | `invoke` bridge | `app/package.json` |
| Better Auth | https://github.com/better-auth/better-auth | MIT | Sign-in client | `app/package.json` |

Installed dependencies shared with web-spa: react, react-dom, react-router, @tanstack/react-query, Tailwind CSS, Vite
(all MIT), lucide-react (ISC). The NSIS installer tool that `cargo tauri build` downloads is zlib/libpng licensed;
it is not stored in this repository.
