import { Button, EmptyState, Input, ListRow, PageHeader, SegmentedControl, Skeleton, SkeletonGroup } from '@app/ui'
import { ChevronRight, NotebookPen, Plus, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { timeAgo } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { filterNotes, noteTitle, rangeOptions, type Range } from '../model/note'
import { useNotes } from '../state/useNotes'

export function NotesListScreen() {
  const query = useNotes()
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<Range>('all')
  const filtered = useMemo(() => (query.data ? filterNotes(query.data, search, range) : []), [query.data, search, range])
  const filtering = search.trim() !== '' || range !== 'all'

  return (
    <>
      <PageHeader
        title="Notes"
        description="Everything you have written, newest first."
        actions={
          <Button asChild>
            <Link to="/notes/new">
              <Plus aria-hidden />
              New note
            </Link>
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input type="search" aria-label="Search notes" placeholder="Search notes" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <SegmentedControl label="Show notes from" value={range} onValueChange={(v) => setRange(v as Range)} options={rangeOptions} />
      </div>

      <QueryBoundary
        query={query}
        loading={
          <SkeletonGroup label="Loading notes" className="divide-y divide-border rounded-lg border border-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-3.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </SkeletonGroup>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={<NotebookPen />}
            title="No notes yet"
            description="Capture the first thing you do not want to forget."
            action={
              <Button asChild>
                <Link to="/notes/new">Write a note</Link>
              </Button>
            }
          />
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No matching notes"
              description="Try a different word, or widen the date filter."
              action={
                filtering && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('')
                      setRange('all')
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <p className="mb-2 text-sm text-text-muted" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {filtered.map((n) => (
                  <li key={n.id}>
                    <ListRow as={Link} to={`/notes/${n.id}`} title={noteTitle(n)} subtitle={timeAgo(n.createdAt)} trailing={<ChevronRight className="size-4" aria-hidden />} />
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
