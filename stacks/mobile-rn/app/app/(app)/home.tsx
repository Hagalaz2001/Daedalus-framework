import { useRouter } from "expo-router";
import { HomeScreen } from "@/features/home";

export default function Home() {
  const router = useRouter();
  return (
    <HomeScreen
      onOpenNote={(id) => router.push({ pathname: "/note/[id]", params: { id } })}
      onSeeAll={() => router.navigate("/notes")}
      onCreate={() => router.push("/note/new")}
      onProfile={() => router.push("/profile")}
    />
  );
}
