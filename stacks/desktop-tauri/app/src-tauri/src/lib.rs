//! App entry. Each concern has its own module and its own commands; `lib.rs` only wires them together.
//!   session  the bearer token in the OS credential store
//!   settings theme and background preferences (pure logic, unit-tested)
//!   shell    the native window: theme, show/hide, single instance focus

mod session;
mod settings;
mod shell;

use session::{KeyringStore, MemoryStore, SharedStore};
use tauri_plugin_window_state::StateFlags;

const BUNDLE_ID: &str = "{bundleId}";

pub fn run() {
    // The OS store is opened once. If it is unavailable (a Linux box without a keyring service) the app still runs and
    // keeps the token in memory, so the user signs in again on the next launch.
    let store: SharedStore = match KeyringStore::new(BUNDLE_ID) {
        Ok(s) => Box::new(s),
        Err(_) => Box::new(MemoryStore::default()),
    };

    tauri::Builder::default()
        // Must be the first plugin: a second launch focuses the running window and exits.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| shell::focus(app)))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // Remember size and position, but not visibility: the window is shown after the first paint.
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .manage(store)
        .setup(|app| {
            shell::prepare(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            session::token_get,
            session::token_set,
            session::token_clear,
            shell::theme_apply,
            shell::app_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
