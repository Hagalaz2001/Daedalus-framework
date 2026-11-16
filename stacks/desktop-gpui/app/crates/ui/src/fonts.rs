//! Fonts bundled with the app (SIL OFL, see assets/fonts/OFL.txt). A preset that names another family
//! needs its font files added here; until then the UI falls back to the bundled family.
use gpui_kit::App;
use std::borrow::Cow;

pub const FAMILY: &str = "Geist";

pub fn register(cx: &mut App) {
    let fonts: Vec<Cow<'static, [u8]>> = [
        &include_bytes!("../assets/fonts/Geist-Regular.ttf")[..],
        &include_bytes!("../assets/fonts/Geist-Medium.ttf")[..],
        &include_bytes!("../assets/fonts/Geist-SemiBold.ttf")[..],
    ]
    .into_iter()
    .map(Cow::Borrowed)
    .collect();
    if let Err(e) = cx.text_system().add_fonts(fonts) {
        eprintln!("could not register bundled fonts: {e}");
    }
}
