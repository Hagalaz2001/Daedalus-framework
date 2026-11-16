import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getItem, setItem } from "@/shared/lib/storage";

const KEY = "onboarded";
type Status = "loading" | "pending" | "done";
type Onboarding = { status: Status; complete: () => void };
const Ctx = createContext<Onboarding | null>(null);

/** Remembers whether the first-run introduction was seen. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  useEffect(() => {
    void getItem(KEY).then((v) => setStatus(v === "1" ? "done" : "pending"));
  }, []);
  const complete = useCallback(() => {
    setStatus("done");
    void setItem(KEY, "1");
  }, []);
  const value = useMemo(() => ({ status, complete }), [status, complete]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding(): Onboarding {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOnboarding needs <OnboardingProvider>");
  return v;
}
