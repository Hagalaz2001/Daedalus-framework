import { useRouter } from "expo-router";
import { SignUpScreen } from "@/features/auth";

export default function SignUp() {
  const router = useRouter();
  return <SignUpScreen onSignIn={() => (router.canGoBack() ? router.back() : router.replace("/sign-in"))} />;
}
