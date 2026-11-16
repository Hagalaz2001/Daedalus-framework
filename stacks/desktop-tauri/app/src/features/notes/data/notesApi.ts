import { api, ensureOk, unwrap, type Note } from '@/shared/api'

// Everything goes through the generated client (contracts/openapi.yaml: listNotes, getNote, createNote, updateNote, deleteNote).
// The list reads the first 100 notes; add cursor paging (X-Next-Cursor) when a project needs more.
export const listNotes = (): Promise<Note[]> =>
  unwrap(api.GET('/notes', { params: { query: { limit: 100 } } }), 'Could not load your notes.')

export const getNote = (id: string): Promise<Note> =>
  unwrap(api.GET('/notes/{id}', { params: { path: { id } } }), 'Could not load the note.')

export const createNote = (text: string): Promise<Note> =>
  unwrap(api.POST('/notes', { body: { text: text.trim() }, params: { header: { 'Idempotency-Key': crypto.randomUUID() } } }), 'Could not save the note.')

export const updateNote = ({ id, text }: { id: string; text: string }): Promise<Note> =>
  unwrap(api.PATCH('/notes/{id}', { params: { path: { id } }, body: { text: text.trim() } }), 'Could not save the note.')

export const deleteNote = (id: string): Promise<void> =>
  ensureOk(api.DELETE('/notes/{id}', { params: { path: { id } } }), 'Could not delete the note.')
