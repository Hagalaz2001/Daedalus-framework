import { Button, Field, Textarea } from '@app/ui'
import { useState, type FormEvent } from 'react'
import { MAX_NOTE_LENGTH, validateNoteText } from '../model/note'

/** Create/edit form. Pass `initialText` + `submitLabel="Save"` for editing once the contract has an update operation. */
export function NoteForm({
  initialText = '',
  submitLabel = 'Add note',
  pending,
  error,
  onSubmit,
  onCancel,
  rows,
}: {
  initialText?: string
  submitLabel?: string
  pending?: boolean
  error?: string | null
  onSubmit: (text: string) => void
  onCancel?: () => void
  rows?: number
}) {
  const [text, setText] = useState(initialText)
  const [touchedError, setTouchedError] = useState<string>()
  const shown = touchedError ?? error ?? undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const invalid = validateNoteText(text)
    setTouchedError(invalid)
    if (!invalid) onSubmit(text.trim())
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Note" error={shown} hint={<span aria-live="off">{text.length}/{MAX_NOTE_LENGTH}</span>}>
        {(p) => (
          <Textarea
            {...p}
            rows={rows ?? 5}
            value={text}
            maxLength={MAX_NOTE_LENGTH + 50}
            placeholder="What is on your mind?"
            onChange={(e) => {
              setText(e.target.value)
              if (touchedError) setTouchedError(undefined)
            }}
          />
        )}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
