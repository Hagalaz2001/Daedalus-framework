//! Entry point: single instance, GPUI app setup, window, menus and shortcuts.
mod root;

use app_services::Services;
use app_storage::Storage;
use app_ui::{fonts, theme};
use gpui_kit::component::TitleBar;
use gpui_kit::{App, AppContext as _, Bounds, KeyBinding, Menu, MenuItem, WindowBounds, px, size};
use root::{AppRoot, GoDashboard, GoNotes, GoProfile, GoSettings, NewNote, Quit, ToggleTheme};

/// Shown in the title bar and used for the data folder. Replaced when a project is generated.
const APP_NAME: &str = "{displayName}";
const APP_ID: &str = "{bundleId}";

/// Primary modifier: Cmd on macOS, Ctrl elsewhere.
macro_rules! key {
    ($k:literal) => {
        if cfg!(target_os = "macos") { concat!("cmd-", $k) } else { concat!("ctrl-", $k) }
    };
}

fn main() {
    // A second launch would open a second window on the same local database; exit instead.
    // (Focusing the first window is a documented next step, see README.)
    let instance = single_instance::SingleInstance::new(APP_ID).expect("single-instance lock");
    if !instance.is_single() {
        return;
    }
    let open = std::env::args().skip_while(|a| a != "--open").nth(1);

    gpui_kit::application().with_assets(gpui_kit::assets::Assets).run(move |cx: &mut App| {
        gpui_kit::init(cx);
        fonts::register(cx);
        let store = Storage::open(APP_ID).unwrap_or_else(|e| {
            eprintln!("cannot open settings ({e}); using a temporary file");
            Storage::open_at(std::env::temp_dir().join(format!("{APP_ID}.redb")), APP_ID).expect("temporary settings file")
        });
        theme::apply(store.theme_mode(), cx);
        let services = Services::new(store);

        cx.bind_keys([
            KeyBinding::new(key!("1"), GoDashboard, None),
            KeyBinding::new(key!("2"), GoNotes, None),
            KeyBinding::new(key!("n"), NewNote, None),
            KeyBinding::new(key!(","), GoSettings, None),
            KeyBinding::new(key!("3"), GoProfile, None),
            KeyBinding::new(key!("shift-l"), ToggleTheme, None),
            KeyBinding::new(key!("q"), Quit, None),
        ]);
        cx.on_action(|_: &Quit, cx| cx.quit());
        cx.set_menus(vec![
            Menu {
                name: APP_NAME.into(),
                items: vec![MenuItem::action("Settings", GoSettings), MenuItem::action("Quit", Quit)],
                disabled: false,
            },
            Menu {
                name: "Go".into(),
                items: vec![
                    MenuItem::action("Dashboard", GoDashboard),
                    MenuItem::action("Notes", GoNotes),
                    MenuItem::action("New note", NewNote),
                    MenuItem::action("Profile", GoProfile),
                ],
                disabled: false,
            },
            Menu { name: "View".into(), items: vec![MenuItem::action("Toggle light/dark", ToggleTheme)], disabled: false },
        ]);

        let bounds = Bounds::centered(None, size(px(1120.0), px(740.0)), cx);
        let mut options = TitleBar::window_options();
        options.window_bounds = Some(WindowBounds::Windowed(bounds));
        options.window_min_size = Some(size(px(880.0), px(560.0)));
        gpui_kit::open_window(options, cx, move |window, cx| cx.new(|cx| AppRoot::new(APP_NAME, services, open, window, cx)))
            .expect("open window");
        cx.activate(true);
    });
    drop(instance);
}
