import { Button, Input, toast } from '@app/ui'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useCreateNote } from '../state/useNotes'
import { validateNoteText } from '../model/note'

/** One-line capture box (dashboard, onboarding). */
export function QuickNote({ onCreated, placeholder = 'Write a note and press Enter' }: { onCreated?: () => void; placeholder?: string }) {
  const create = useCreateNote()
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const invalid = validateNoteText(text)
    setError(invalid)
    if (invalid) return
    create.mutate(text, {
      onSuccess: () => {
        setText('')
        toast.success('Note saved')
        onCreated?.()
      },
      onError: (err) => setError(err.message),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <Input
          aria-label="New note"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'quick-note-error' : undefined}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(undefined)
          }}
        />
        <Button type="submit" loading={create.isPending} className="shrink-0">
          <Plus aria-hidden />
          Add
        </Button>
      </div>
      {error && (
        <p id="quick-note-error" role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  )
}
