import { useRouter } from "expo-router";
import { EmptyState, Screen } from "@/shared/ui";

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState title="Page not found" message="That screen does not exist or has moved." actionLabel="Go home" onAction={() => router.replace("/")} />
    </Screen>
  );
}
