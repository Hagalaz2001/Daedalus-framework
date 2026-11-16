import { useLocalSearchParams, useRouter } from "expo-router";
import { NoteDetailScreen } from "@/features/notes";

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <NoteDetailScreen id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace("/notes"))} />;
}
