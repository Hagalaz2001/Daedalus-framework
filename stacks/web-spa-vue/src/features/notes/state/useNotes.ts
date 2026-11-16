import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createNote, deleteNote, listNotes } from '../data/notesApi'

export const notesKey = ['notes'] as const

export const useNotes = () => useQuery({ queryKey: notesKey, queryFn: listNotes })

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createNote, onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }) })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteNote, onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }) })
}
