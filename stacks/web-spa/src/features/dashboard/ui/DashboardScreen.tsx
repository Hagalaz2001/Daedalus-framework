import { Button, EmptyState, ListRow, PageHeader, Skeleton, SkeletonGroup } from '@app/ui'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useSession } from '@/features/auth'
import { noteTitle, QuickNote, useNotes } from '@/features/notes'
import { timeAgo } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { computeStats, dailyCounts, greeting } from '../model/stats'

function Activity({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts)
  return (
    <div role="img" aria-label={`Notes per day over the last ${counts.length} days: ${counts.join(', ')}`} className="flex h-16 items-end gap-1.5">
      {counts.map((c, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${i === counts.length - 1 ? 'bg-primary' : 'bg-primary/25'}`}
          style={{ height: `${Math.max(8, (c / max) * 100)}%`, opacity: c === 0 ? 0.45 : 1 }}
        />
      ))}
    </div>
  )
}

export function DashboardScreen() {
  const { user } = useSession()
  const query = useNotes()
  const first = user?.name.split(' ')[0]

  return (
    <>
      <PageHeader title={`${greeting()}${first ? `, ${first}` : ''}`} description="Here is where your notes stand." />
      <section aria-label="Quick note" className="mb-10">
        <QuickNote />
      </section>

      <QueryBoundary
        query={query}
        loading={
          <SkeletonGroup label="Loading dashboard" className="space-y-8">
            <Skeleton className="h-36" />
            <Skeleton className="h-48" />
          </SkeletonGroup>
        }
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<Sparkles />} title="A blank page, ready when you are" description="Add your first note above and your numbers will show up here." />}
      >
        {(notes) => {
          const created = notes.map((n) => n.createdAt)
          const s = computeStats(created)
          return (
            <>
              <section aria-label="Activity" className="mb-10 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-12">
                <dl className="grid grid-cols-3 gap-8">
                  {[
                    ['All', s.total],
                    ['Week', s.thisWeek],
                    ['Today', s.today],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-text-muted">{label}</dt>
                      <dd className="font-display text-5xl font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <p className="mb-2 text-sm text-text-muted">Last 14 days</p>
                  <Activity counts={dailyCounts(created)} />
                </div>
              </section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Recent</h2>
                <Button asChild variant="link">
                  <Link to="/notes">
                    All notes <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {notes.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <ListRow as={Link} to={`/notes/${n.id}`} title={noteTitle(n)} trailing={timeAgo(n.createdAt)} />
                  </li>
                ))}
              </ul>
            </>
          )
        }}
      </QueryBoundary>
    </>
  )
}
