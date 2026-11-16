import { useColorScheme } from "nativewind";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getItem, setItem } from "../lib/storage";
import { type Palette, tokens } from "./tokens.g";

export type ThemeMode = "system" | "light" | "dark";
export type Theme = {
  scheme: "light" | "dark";
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** For the few places that need a raw colour (status bar, native headers). Everything else uses classes. */
  colors: Palette;
  radius: typeof tokens.radius;
  space: typeof tokens.space;
};

const KEY = "theme_mode";
const ThemeContext = createContext<Theme | null>(null);

/** Light/dark follows the device unless the person picked one. NativeWind flips the CSS variables from global.css. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    // Apply the saved choice, or "system" so the web build (class-based dark mode) follows the device too.
    void getItem(KEY).then((v) => {
      const saved = v === "light" || v === "dark" || v === "system" ? v : "system";
      setModeState(saved);
      setColorScheme(saved);
    });
  }, [setColorScheme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setColorScheme(m);
    void setItem(KEY, m);
  }, [setColorScheme]);

  const value = useMemo<Theme>(() => {
    const scheme = colorScheme === "dark" ? "dark" : "light";
    return { scheme, mode, setMode, colors: tokens[scheme], radius: tokens.radius, space: tokens.space };
  }, [colorScheme, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme needs <ThemeProvider>");
  return t;
}

export { MAX_FONT_SCALE, TOUCH } from "./typography";
export { tokens } from "./tokens.g";
