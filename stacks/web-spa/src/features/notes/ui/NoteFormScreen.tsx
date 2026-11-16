import { Button, PageHeader, toast } from '@app/ui'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useCreateNote } from '../state/useNotes'
import { NoteForm } from './NoteForm'

export function NoteFormScreen() {
  const create = useCreateNote()
  const navigate = useNavigate()
  return (
    <>
      <Button asChild variant="link" className="mb-6">
        <Link to="/notes">
          <ArrowLeft aria-hidden />
          All notes
        </Link>
      </Button>
      <PageHeader title="New note" description="Plain text, up to 500 characters." />
      <div className="max-w-xl">
        <NoteForm
          pending={create.isPending}
          error={create.error?.message}
          onCancel={() => void navigate('/notes')}
          onSubmit={(text) =>
            create.mutate(text, {
              onSuccess: (note) => {
                toast.success('Note saved')
                void navigate(`/notes/${note.id}`)
              },
            })
          }
        />
      </div>
    </>
  )
}
