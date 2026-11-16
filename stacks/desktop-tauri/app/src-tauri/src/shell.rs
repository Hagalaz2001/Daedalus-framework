//! The native window: theme and background, showing it after the first paint, focusing it from a second launch.

use crate::settings::{parse_hex_color, Settings, Theme};
use tauri::{AppHandle, Manager, WebviewWindow};

pub const MAIN: &str = "main";

fn settings_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app.path().app_config_dir().map_err(|e| e.to_string())?.join("settings.json"))
}

/// Paints the title bar theme and the window background from saved settings.
pub fn apply(window: &WebviewWindow, s: &Settings) {
    let _ = window.set_theme(s.theme.window_theme());
    if let Some((r, g, b)) = s.surface.as_deref().and_then(parse_hex_color) {
        let _ = window.set_background_color(Some(tauri::window::Color(r, g, b, 255)));
    }
}

/// Applies the saved settings before the window is shown, and shows it anyway after a few seconds so a broken
/// frontend can never leave the user with an invisible app.
pub fn prepare(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN) else { return };
    if let Ok(path) = settings_path(app) {
        apply(&window, &Settings::load(&path));
    }
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(4));
        let _ = window.show();
    });
}

/// A second launch lands here: bring the existing window forward.
pub fn focus(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn theme_apply(app: AppHandle, window: WebviewWindow, choice: String, surface: Option<String>) -> Result<(), String> {
    let theme = Theme::parse(&choice).ok_or("unknown theme")?;
    if let Some(s) = &surface {
        parse_hex_color(s).ok_or("surface must look like #rrggbb")?;
    }
    let path = settings_path(&app)?;
    let mut settings = Settings::load(&path);
    settings.theme = theme;
    if surface.is_some() {
        settings.surface = surface;
    }
    settings.save(&path)?;
    apply(&window, &settings);
    Ok(())
}

#[tauri::command]
pub fn app_ready(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())
}
