import { OnboardingScreen, useOnboarding } from "@/features/onboarding";

export default function Onboarding() {
  return <OnboardingScreen onDone={useOnboarding().complete} />;
}
