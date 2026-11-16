import { useRouter } from "expo-router";
import { SettingsScreen } from "@/features/settings";

export default function Settings() {
  const router = useRouter();
  return <SettingsScreen onProfile={() => router.push("/profile")} />;
}
