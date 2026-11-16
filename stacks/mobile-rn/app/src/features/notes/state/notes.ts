import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, listNotes, type Note } from "../data/notes-api";

const KEY = ["notes"] as const;

export const useNotes = () => useQuery({ queryKey: KEY, queryFn: listNotes });

export function useNote(id: string) {
  const q = useNotes();
  return { ...q, note: q.data?.find((n) => n.id === id) };
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: (note) => qc.setQueryData<Note[]>(KEY, (old) => [note, ...(old ?? [])]),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, id) => qc.setQueryData<Note[]>(KEY, (old) => old?.filter((n) => n.id !== id)),
  });
}
