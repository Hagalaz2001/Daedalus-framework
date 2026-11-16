//! Shared look and feel. Colours, radii and fonts come from `design/tokens.json` via `tokens.g.rs`;
//! screens use these components instead of styling raw divs.
pub mod components;
pub mod fonts;
pub mod shell;
pub mod theme;
pub mod tokens;

pub use gpui_kit;

/// Event every screen emits to ask the app shell to go somewhere.
pub struct Navigate(pub app_core::Route);
