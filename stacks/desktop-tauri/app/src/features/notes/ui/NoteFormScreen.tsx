import { Button, PageHeader, Skeleton, toast } from '@app/ui'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { QueryBoundary } from '@/shared/ui'
import { useCreateNote, useNote, useUpdateNote } from '../state/useNotes'
import { NoteForm } from './NoteForm'

/** One screen for both: `/notes/new` creates, `/notes/:id/edit` edits. */
export function NoteFormScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const create = useCreateNote()
  const update = useUpdateNote()
  const existing = useNote(id)
  const mutation = id ? update : create
  const done = (noteId: string) => {
    toast.success('Note saved')
    void navigate(`/notes/${noteId}`)
  }

  return (
    <>
      <Button asChild variant="link" className="mb-6">
        <Link to={id ? `/notes/${id}` : '/notes'}>
          <ArrowLeft aria-hidden />
          {id ? 'Back to note' : 'All notes'}
        </Link>
      </Button>
      <PageHeader title={id ? 'Edit note' : 'New note'} description="Plain text, up to 500 characters." />
      <div className="max-w-xl">
        {id ? (
          <QueryBoundary query={existing} loading={<Skeleton className="h-48" />}>
            {(note) => (
              <NoteForm
                initialText={note.text}
                submitLabel="Save"
                pending={update.isPending}
                error={update.error?.message}
                onCancel={() => void navigate(`/notes/${id}`)}
                onSubmit={(text) => update.mutate({ id, text }, { onSuccess: (n) => done(n.id) })}
              />
            )}
          </QueryBoundary>
        ) : (
          <NoteForm
            pending={mutation.isPending}
            error={mutation.error?.message}
            onCancel={() => void navigate('/notes')}
            onSubmit={(text) => create.mutate(text, { onSuccess: (n) => done(n.id) })}
          />
        )}
      </div>
    </>
  )
}
