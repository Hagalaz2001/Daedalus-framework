fn main() {
    // Every command the webview may call is listed here and granted one by one in capabilities/default.json.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
        "token_get",
        "token_set",
        "token_clear",
        "theme_apply",
        "app_ready",
    ])))
    .expect("failed to run the Tauri build script");
}
