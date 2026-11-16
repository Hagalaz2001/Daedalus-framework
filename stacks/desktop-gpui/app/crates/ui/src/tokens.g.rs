// Generated from design/tokens.json by `cargo xtask tokens`. Do not edit.

/// One colour per role, as 0xRRGGBB.
#[derive(Clone, Copy, Debug)]
pub struct Palette {
    pub border: u32,
    pub danger: u32,
    pub on_primary: u32,
    pub primary: u32,
    pub success: u32,
    pub surface: u32,
    pub surface_muted: u32,
    pub text: u32,
    pub text_muted: u32,
    pub warning: u32,
}

pub const LIGHT: Palette = Palette {
    border: 0xE1E4EA,
    danger: 0xB42318,
    on_primary: 0xFFFFFF,
    primary: 0x2A4BD7,
    success: 0x17743D,
    surface: 0xFFFFFF,
    surface_muted: 0xF5F6F8,
    text: 0x0E1116,
    text_muted: 0x525A66,
    warning: 0xA15C07,
};

pub const DARK: Palette = Palette {
    border: 0x262B34,
    danger: 0xFF8A7D,
    on_primary: 0x0B1030,
    primary: 0x8DA2FF,
    success: 0x4CCB85,
    surface: 0x0E1116,
    surface_muted: 0x161A21,
    text: 0xEEF0F4,
    text_muted: 0xA3ABB8,
    warning: 0xF0B45A,
};

pub mod radius {
    pub const LG: f32 = 14.0;
    pub const MD: f32 = 10.0;
    pub const SM: f32 = 6.0;
}

pub mod space {
    pub const S1: f32 = 4.0;
    pub const S2: f32 = 8.0;
    pub const S3: f32 = 12.0;
    pub const S4: f32 = 16.0;
    pub const S6: f32 = 24.0;
    pub const S8: f32 = 32.0;
}

pub const FONT_DISPLAY: &str = "Geist";
pub const FONT_MONO: &str = "Geist Mono";
pub const FONT_SANS: &str = "Geist";
