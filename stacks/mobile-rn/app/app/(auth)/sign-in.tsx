import { useRouter } from "expo-router";
import { SignInScreen } from "@/features/auth";

export default function SignIn() {
  const router = useRouter();
  return <SignInScreen onSignUp={() => router.push("/sign-up")} onForgotPassword={() => router.push("/forgot-password")} />;
}
