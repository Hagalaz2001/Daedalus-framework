import { useRouter } from "expo-router";
import { ProfileScreen } from "@/features/profile";

export default function Profile() {
  const router = useRouter();
  return <ProfileScreen onBack={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />;
}
