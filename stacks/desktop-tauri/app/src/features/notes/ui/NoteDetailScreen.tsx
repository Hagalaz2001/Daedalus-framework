import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, PageHeader, Skeleton, SkeletonGroup, toast } from '@app/ui'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { noteTitle } from '../model/note'
import { useDeleteNote, useNote } from '../state/useNotes'

export function NoteDetailScreen() {
  const { id } = useParams()
  const query = useNote(id)
  const remove = useDeleteNote()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)

  return (
    <>
      <Button asChild variant="link" className="mb-6">
        <Link to="/notes">
          <ArrowLeft aria-hidden />
          All notes
        </Link>
      </Button>
      <QueryBoundary
        query={query}
        loading={
          <SkeletonGroup label="Loading note" className="space-y-4">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </SkeletonGroup>
        }
      >
        {(note) => (
          <>
            <PageHeader
              title={noteTitle(note)}
              description={formatDate(note.createdAt)}
              actions={
                <>
                  <Button asChild variant="secondary">
                    <Link to={`/notes/${note.id}/edit`}>
                      <Pencil aria-hidden />
                      Edit
                    </Link>
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(true)}>
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </>
              }
            />
            <Card>
              <CardContent>
                <p className="text-lg leading-relaxed break-words whitespace-pre-wrap">{note.text}</p>
              </CardContent>
            </Card>
            <Dialog open={confirm} onOpenChange={setConfirm}>
              <DialogContent>
                <DialogTitle>Delete this note?</DialogTitle>
                <DialogDescription>It will be removed for good. This cannot be undone.</DialogDescription>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setConfirm(false)}>
                    Keep it
                  </Button>
                  <Button
                    variant="danger"
                    loading={remove.isPending}
                    onClick={() =>
                      remove.mutate(note.id, {
                        onSuccess: () => {
                          toast.success('Note deleted')
                          void navigate('/notes')
                        },
                        onError: (e) => toast.error(e.message),
                      })
                    }
                  >
                    Delete note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </QueryBoundary>
    </>
  )
}
