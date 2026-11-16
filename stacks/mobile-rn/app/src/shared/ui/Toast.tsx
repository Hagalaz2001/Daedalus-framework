import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../lib/cn";
import { Text } from "./Text";

type Tone = "info" | "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi | null>(null);
const DURATION_MS = 3500;
const ACCENT = { info: "border-l-primary", success: "border-l-success", error: "border-l-destructive" } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const next = useRef(0);

  const show = useCallback((message: string, tone: Tone = "info") => {
    setItem({ id: ++next.current, message, tone });
  }, []);
  const api = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => setItem(null), DURATION_MS);
    return () => clearTimeout(t);
  }, [item]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {item
        ? (
          <View pointerEvents="none" className="absolute inset-x-4" style={{ bottom: insets.bottom + 72 }}>
            <View
              role="alert"
              accessibilityLiveRegion="polite"
              className={cn("rounded-md border-l-4 bg-foreground p-4", ACCENT[item.tone])}
            >
              <Text className="text-background">{item.message}</Text>
            </View>
          </View>
        )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const t = useContext(ToastContext);
  if (!t) throw new Error("useToast needs <ToastProvider>");
  return t;
}
