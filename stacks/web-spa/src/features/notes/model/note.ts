import type { Note } from '@/shared/api'

export const MAX_NOTE_LENGTH = 500 // matches NewNote.text maxLength in contracts/openapi.yaml

export type Range = 'all' | 'today' | 'week'
export const rangeOptions: { value: Range; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
]

/** First line of the note, used as its title in lists. */
export const noteTitle = (n: Pick<Note, 'text'>) => n.text.split('\n')[0]?.trim() || 'Untitled'

const DAY = 86_400_000

export function filterNotes(notes: Note[], query: string, range: Range, now = Date.now()): Note[] {
  const q = query.trim().toLowerCase()
  const maxAge = range === 'today' ? DAY : range === 'week' ? 7 * DAY : Infinity
  return notes.filter((n) => now - new Date(n.createdAt).getTime() <= maxAge && (!q || n.text.toLowerCase().includes(q)))
}

export function validateNoteText(text: string): string | undefined {
  const t = text.trim()
  if (!t) return 'Write something first.'
  if (t.length > MAX_NOTE_LENGTH) return `Keep it under ${MAX_NOTE_LENGTH} characters.`
  return undefined
}
