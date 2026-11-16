import { useRouter } from "expo-router";
import { ForgotPasswordScreen } from "@/features/auth";

export default function ForgotPassword() {
  const router = useRouter();
  return <ForgotPasswordScreen onBack={() => (router.canGoBack() ? router.back() : router.replace("/sign-in"))} />;
}
