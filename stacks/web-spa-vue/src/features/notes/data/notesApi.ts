import { api, ensureOk, unwrap, type Note } from '@/shared/api'

// Everything goes through the generated client (contracts/openapi.yaml: listNotes, createNote, deleteNote).
export async function listNotes(): Promise<Note[]> {
  return unwrap(await api.GET('/notes'), 'Could not load your notes.')
}

export async function createNote(text: string): Promise<Note> {
  return unwrap(await api.POST('/notes', { body: { text: text.trim() } }), 'Could not save the note.')
}

export async function deleteNote(id: string): Promise<void> {
  ensureOk(await api.DELETE('/notes/{id}', { params: { path: { id } } }), 'Could not delete the note.')
}
