import { useColorScheme as useNativeWind } from "nativewind";
import { useColorScheme as useDeviceScheme } from "react-native";
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
  const { setColorScheme } = useNativeWind();
  const device = useDeviceScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    void getItem(KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setModeState(v);
    });
  }, []);

  // NativeWind needs an explicit light or dark (class-based dark mode on web), so resolve "system" here.
  const scheme = mode === "system" ? (device === "dark" ? "dark" : "light") : mode;
  useEffect(() => {
    try {
      setColorScheme(scheme);
    } catch {
      // Under Jest there is no compiled Tailwind config, so NativeWind refuses manual schemes; classes are not tested.
    }
  }, [scheme, setColorScheme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void setItem(KEY, m);
  }, []);

  const value = useMemo<Theme>(() => {
    return { scheme, mode, setMode, colors: tokens[scheme], radius: tokens.radius, space: tokens.space };
  }, [scheme, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme needs <ThemeProvider>");
  return t;
}

export { MAX_FONT_SCALE, TOUCH } from "./typography";
export { tokens } from "./tokens.g";
