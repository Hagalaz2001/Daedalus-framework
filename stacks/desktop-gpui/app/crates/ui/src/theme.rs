//! Applies the token palette (light/dark) to GPUI Component's theme.
use crate::{fonts, tokens};
use app_core::ThemeMode;
use gpui_kit::component::{Theme, ThemeMode as KitMode};
use gpui_kit::{App, Hsla, Rgba, WindowAppearance, px, rgb};

fn hsla(hex: u32) -> Hsla {
    rgb(hex).into()
}

/// Linear mix of two colours, `w` of `b`.
fn mix(a: u32, b: u32, w: f32) -> Hsla {
    let (a, b) = (rgb(a), rgb(b));
    Rgba { r: a.r + (b.r - a.r) * w, g: a.g + (b.g - a.g) * w, b: a.b + (b.b - a.b) * w, a: 1.0 }.into()
}

pub fn is_dark(mode: ThemeMode, cx: &App) -> bool {
    match mode {
        ThemeMode::Light => false,
        ThemeMode::Dark => true,
        ThemeMode::System => matches!(cx.window_appearance(), WindowAppearance::Dark | WindowAppearance::VibrantDark),
    }
}

pub fn palette(dark: bool) -> tokens::Palette {
    if dark { tokens::DARK } else { tokens::LIGHT }
}

/// Switch the whole app to `mode` and re-skin GPUI Component with the token palette.
pub fn apply(mode: ThemeMode, cx: &mut App) {
    let dark = is_dark(mode, cx);
    Theme::change(if dark { KitMode::Dark } else { KitMode::Light }, None, cx);
    let p = palette(dark);
    let (bg, fg, muted, border) = (p.surface, p.text, p.surface_muted, p.border);
    Theme::update(cx, |t| {
        t.font_family = fonts::FAMILY.into();
        t.font_size = px(14.0);
        t.radius = px(tokens::radius::MD);
        t.radius_lg = px(tokens::radius::LG);
        let c = &mut t.colors;
        c.background = hsla(bg);
        c.foreground = hsla(fg);
        c.border = hsla(border);
        c.input = mix(border, fg, 0.12);
        c.ring = hsla(p.primary);
        c.caret = hsla(p.primary);
        c.selection = hsla(p.primary).opacity(0.25);
        c.muted = hsla(muted);
        c.muted_foreground = hsla(p.text_muted);
        c.accent = mix(muted, fg, 0.05);
        c.accent_foreground = hsla(fg);
        c.popover = hsla(bg);
        c.popover_foreground = hsla(fg);
        c.overlay = hsla(0x000000).opacity(if dark { 0.6 } else { 0.4 });
        c.window_border = hsla(border);
        c.title_bar = hsla(muted);
        c.title_bar_border = hsla(border);
        c.status_bar = hsla(muted);
        c.status_bar_border = hsla(border);

        c.primary = hsla(p.primary);
        c.primary_foreground = hsla(p.on_primary);
        c.primary_hover = mix(p.primary, fg, 0.12);
        c.primary_active = mix(p.primary, fg, 0.22);
        c.button_primary = c.primary;
        c.button_primary_foreground = c.primary_foreground;
        c.button_primary_hover = c.primary_hover;
        c.button_primary_active = c.primary_active;
        c.link = hsla(p.primary);
        c.link_hover = mix(p.primary, fg, 0.15);
        c.link_active = mix(p.primary, fg, 0.25);

        c.secondary = mix(muted, fg, 0.04);
        c.secondary_foreground = hsla(fg);
        c.secondary_hover = mix(muted, fg, 0.09);
        c.secondary_active = mix(muted, fg, 0.14);
        c.button = c.secondary;
        c.button_foreground = c.secondary_foreground;
        c.button_hover = c.secondary_hover;
        c.button_active = c.secondary_active;

        c.success = hsla(p.success);
        c.success_foreground = hsla(if dark { 0x06140C } else { 0xFFFFFF });
        c.success_hover = mix(p.success, fg, 0.12);
        c.success_active = mix(p.success, fg, 0.22);
        c.warning = hsla(p.warning);
        c.warning_foreground = hsla(if dark { 0x1A1103 } else { 0xFFFFFF });
        c.warning_hover = mix(p.warning, fg, 0.12);
        c.warning_active = mix(p.warning, fg, 0.22);
        c.danger = hsla(p.danger);
        c.danger_foreground = hsla(if dark { 0x1F0905 } else { 0xFFFFFF });
        c.danger_hover = mix(p.danger, fg, 0.12);
        c.danger_active = mix(p.danger, fg, 0.22);
        c.button_danger = c.danger;
        c.button_danger_foreground = c.danger_foreground;
        c.button_danger_hover = c.danger_hover;
        c.button_danger_active = c.danger_active;
        c.info = hsla(p.primary);
        c.info_foreground = hsla(p.on_primary);

        c.sidebar = hsla(muted);
        c.sidebar_foreground = hsla(fg);
        c.sidebar_border = hsla(border);
        c.sidebar_accent = mix(muted, fg, 0.07);
        c.sidebar_accent_foreground = hsla(fg);
        c.sidebar_primary = hsla(p.primary);
        c.sidebar_primary_foreground = hsla(p.on_primary);

        c.list = hsla(bg);
        c.list_even = hsla(bg);
        c.list_head = hsla(muted);
        c.list_hover = hsla(muted);
        c.list_active = mix(bg, p.primary, 0.1);
        c.list_active_border = hsla(p.primary);

        c.tab = hsla(bg);
        c.tab_bar = hsla(bg);
        c.tab_bar_segmented = mix(muted, fg, 0.05);
        c.tab_active = hsla(bg);
        c.tab_foreground = hsla(p.text_muted);
        c.tab_active_foreground = hsla(fg);

        c.skeleton = mix(border, bg, 0.35);
        c.switch = mix(border, fg, 0.22);
        c.switch_thumb = hsla(bg);
        c.progress_bar = hsla(p.primary);
        c.scrollbar = hsla(bg).opacity(0.0);
        c.scrollbar_thumb = mix(border, fg, 0.25);
        c.scrollbar_thumb_hover = mix(border, fg, 0.4);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mix_endpoints() {
        assert!(mix(0x000000, 0xFFFFFF, 0.0).l < 0.001);
        assert!(mix(0x000000, 0xFFFFFF, 1.0).l > 0.999);
    }

    #[test]
    fn dark_and_light_palettes_differ() {
        assert_ne!(palette(true).surface, palette(false).surface);
    }
}
