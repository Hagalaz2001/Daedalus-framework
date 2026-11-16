import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth";
import { useOnboarding } from "@/features/onboarding";

/** The app entry: sends the person to the first screen that fits their state. */
export default function Index() {
  const { status } = useAuth();
  const onboarding = useOnboarding();
  if (status === "signedIn") return <Redirect href="/home" />;
  return <Redirect href={onboarding.status === "pending" ? "/onboarding" : "/sign-in"} />;
}
