import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createNote, deleteNote, getNote, listNotes, updateNote } from '../data/notesApi'

export const notesKey = ['notes'] as const

export const useNotes = () => useQuery({ queryKey: notesKey, queryFn: listNotes })
export const useNote = (id: string | undefined) => useQuery({ queryKey: [...notesKey, id], queryFn: () => getNote(id!), enabled: !!id })

function useInvalidating<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }) })
}

export const useCreateNote = () => useInvalidating(createNote)
export const useUpdateNote = () => useInvalidating(updateNote)
export const useDeleteNote = () => useInvalidating(deleteNote)
