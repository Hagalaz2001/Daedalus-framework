import { useRouter } from "expo-router";
import { NotesListScreen } from "@/features/notes";

export default function Notes() {
  const router = useRouter();
  return <NotesListScreen onOpen={(id) => router.push({ pathname: "/note/[id]", params: { id } })} onCreate={() => router.push("/note/new")} />;
}
