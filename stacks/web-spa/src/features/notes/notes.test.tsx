import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '@app/ui/testing'
import { renderScreen } from '@/test-utils'
import type { Note } from '@/shared/api'
import { filterNotes, noteTitle, validateNoteText } from './model/note'
import * as api from './data/notesApi'
import { NotesListScreen } from './ui/NotesListScreen'

vi.mock('./data/notesApi')
const listNotes = vi.mocked(api.listNotes)

const hour = 3_600_000
const note = (id: string, text: string, ageMs: number): Note => ({ id, text, createdAt: new Date(Date.now() - ageMs).toISOString() })
const sample = [note('1', 'Buy oat milk', hour), note('2', 'Plan the launch\nsecond line', 3 * 24 * hour), note('3', 'Old idea', 30 * 24 * hour)]

describe('note model', () => {
  it('uses the first line as the title and filters by text and age', () => {
    expect(noteTitle(sample[1]!)).toBe('Plan the launch')
    expect(filterNotes(sample, 'milk', 'all').map((n) => n.id)).toEqual(['1'])
    expect(filterNotes(sample, '', 'today').map((n) => n.id)).toEqual(['1'])
    expect(filterNotes(sample, '', 'week').map((n) => n.id)).toEqual(['1', '2'])
  })
  it('validates text', () => {
    expect(validateNoteText('  ')).toBeTruthy()
    expect(validateNoteText('x'.repeat(501))).toBeTruthy()
    expect(validateNoteText('fine')).toBeUndefined()
  })
})

describe('NotesListScreen states', () => {
  beforeEach(() => listNotes.mockReset())

  it('shows a loading skeleton, then the notes', async () => {
    listNotes.mockResolvedValue(sample)
    const { container } = renderScreen(<NotesListScreen />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading notes')
    expect(await screen.findByRole('link', { name: /Buy oat milk/ })).toBeInTheDocument()
    expect(screen.getByText('3 notes')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('shows the empty state with a call to action', async () => {
    listNotes.mockResolvedValue([])
    renderScreen(<NotesListScreen />)
    expect(await screen.findByRole('heading', { name: 'No notes yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Write a note' })).toHaveAttribute('href', '/notes/new')
  })

  it('shows an error and retries', async () => {
    listNotes.mockRejectedValueOnce(new Error('Network down'))
    renderScreen(<NotesListScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    listNotes.mockResolvedValue(sample)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Old idea/ })).toBeInTheDocument()
  })

  it('searches, shows "no matching notes", and clears filters', async () => {
    listNotes.mockResolvedValue(sample)
    renderScreen(<NotesListScreen />)
    await screen.findByRole('link', { name: /Buy oat milk/ })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'launch')
    expect(screen.getAllByRole('link', { name: /Plan the launch/ })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: /Buy oat milk/ })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search notes' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'zzz')
    expect(screen.getByRole('heading', { name: 'No matching notes' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(screen.getByText('3 notes')).toBeInTheDocument())
  })
})
