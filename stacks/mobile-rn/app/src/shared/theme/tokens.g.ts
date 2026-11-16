// Generated from design/tokens.json by scripts/tokens/mobile-rn.ts. Do not edit; run `deno task sync`.
export const tokens = {
  "light": {
    "primary": "#2a4bd7",
    "onPrimary": "#ffffff",
    "surface": "#ffffff",
    "surfaceMuted": "#f5f6f8",
    "text": "#0e1116",
    "textMuted": "#525a66",
    "border": "#e1e4ea",
    "success": "#17743d",
    "warning": "#a15c07",
    "danger": "#b42318"
  },
  "dark": {
    "primary": "#8da2ff",
    "onPrimary": "#0b1030",
    "surface": "#0e1116",
    "surfaceMuted": "#161a21",
    "text": "#eef0f4",
    "textMuted": "#a3abb8",
    "border": "#262b34",
    "success": "#4ccb85",
    "warning": "#f0b45a",
    "danger": "#ff8a7d"
  },
  "radius": {
    "sm": 6,
    "md": 10,
    "lg": 14
  },
  "space": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "6": 24,
    "8": 32
  },
  "font": {
    "sans": "Geist",
    "display": "Geist",
    "mono": "Geist Mono"
  }
} as const;

export type ColorRole = keyof typeof tokens.light;
export type Palette = Record<ColorRole, string>;
