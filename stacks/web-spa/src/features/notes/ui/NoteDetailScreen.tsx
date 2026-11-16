import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, EmptyState, PageHeader, Skeleton, SkeletonGroup, toast } from '@app/ui'
import { ArrowLeft, FileQuestion, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { noteTitle } from '../model/note'
import { useDeleteNote, useNotes } from '../state/useNotes'

// The contract has no GET /notes/{id}, so the detail is read from the cached list. Add the operation
// to contracts/openapi.yaml and swap this query when notes get heavy.
export function NoteDetailScreen() {
  const { id } = useParams()
  const query = useNotes()
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
        {(notes) => {
          const note = notes.find((n) => n.id === id)
          if (!note)
            return (
              <EmptyState
                icon={<FileQuestion />}
                title="That note is gone"
                description="It may have been deleted on another device."
                action={
                  <Button asChild variant="secondary">
                    <Link to="/notes">Back to notes</Link>
                  </Button>
                }
              />
            )
          return (
            <>
              <PageHeader
                title={noteTitle(note)}
                description={formatDate(note.createdAt)}
                actions={
                  <Button variant="secondary" onClick={() => setConfirm(true)}>
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
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
          )
        }}
      </QueryBoundary>
    </>
  )
}
