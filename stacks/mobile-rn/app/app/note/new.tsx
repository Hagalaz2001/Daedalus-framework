import { useRouter } from "expo-router";
import { NoteFormScreen } from "@/features/notes";

export default function NewNote() {
  const router = useRouter();
  return <NoteFormScreen onDone={() => (router.canGoBack() ? router.back() : router.replace("/notes"))} />;
}
