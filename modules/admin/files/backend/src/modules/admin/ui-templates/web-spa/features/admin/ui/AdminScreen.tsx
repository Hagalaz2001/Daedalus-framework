import { Button, EmptyState, Input, PageHeader, SegmentedControl, Skeleton, SkeletonGroup } from '@app/ui'
import { Database, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { QueryBoundary } from '@/shared/ui'
import type { AdminRow } from '../data/adminApi'
import { useDeleteRow, useResources, useRows, useUpdateRow } from '../state/useAdmin'

type Resource = NonNullable<ReturnType<typeof useResources>['data']>[number]

const show = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** One generic table for any resource the backend registers: columns and editability come from the API. */
function ResourceTable({ resource }: { resource: Resource }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ id: string; values: Record<string, string> } | null>(null)
  const rows = useRows(resource.name, search)
  const update = useUpdateRow(resource.name)
  const remove = useDeleteRow(resource.name)
  const shown = resource.columns.filter((c) => c.type !== 'json').slice(0, 5)

  const startEdit = (row: AdminRow) =>
    setEditing({ id: row.id, values: Object.fromEntries(resource.columns.filter((c) => c.editable).map((c) => [c.name, show(row[c.name])])) })

  return (
    <>
      <Input type="search" aria-label={`Search ${resource.label}`} placeholder={`Search ${resource.label.toLowerCase()}`} className="mb-4 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      <QueryBoundary
        query={rows}
        loading={
          <SkeletonGroup label="Loading rows" className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </SkeletonGroup>
        }
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<Database />} title={`No ${resource.label.toLowerCase()} found`} description="Change the search or add data from the app." />}
      >
        {(data) => (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  {shown.map((c) => (
                    <th key={c.name} className="px-3 py-2 font-medium">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row) => (
                  <tr key={row.id}>
                    {shown.map((c) => (
                      <td key={c.name} className="max-w-64 truncate px-3 py-2">
                        {editing?.id === row.id && c.editable ? (
                          <Input aria-label={c.name} value={editing.values[c.name] ?? ''} onChange={(e) => setEditing({ id: row.id, values: { ...editing.values, [c.name]: e.target.value } })} />
                        ) : (
                          show(row[c.name])
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {editing?.id === row.id ? (
                        <>
                          <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, values: editing.values }, { onSuccess: () => setEditing(null) })}>
                            Save
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {resource.columns.some((c) => c.editable) && (
                            <Button size="sm" variant="secondary" aria-label={`Edit ${row.id}`} onClick={() => startEdit(row)}>
                              <Pencil aria-hidden />
                            </Button>
                          )}
                          {resource.deletable && (
                            <Button size="sm" variant="secondary" aria-label={`Delete ${row.id}`} disabled={remove.isPending} onClick={() => window.confirm('Delete this row?') && remove.mutate(row.id)}>
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
      {(update.error || remove.error) && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {(update.error ?? remove.error)?.message}
        </p>
      )}
    </>
  )
}

export function AdminScreen() {
  const resources = useResources()
  const [name, setName] = useState('')
  return (
    <>
      <PageHeader title="Admin" description="Browse and correct data. Platform administrators only." />
      <QueryBoundary
        query={resources}
        loading={<Skeleton className="h-10 w-64" />}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<Database />} title="Nothing to manage" description="Register tables in the backend admin module." />}
      >
        {(list) => {
          const current = list.find((r) => r.name === name) ?? list[0]!
          return (
            <>
              <SegmentedControl label="Resource" value={current.name} onValueChange={setName} options={list.map((r) => ({ value: r.name, label: r.label }))} />
              <div className="mt-6">
                <ResourceTable key={current.name} resource={current} />
              </div>
            </>
          )
        }}
      </QueryBoundary>
    </>
  )
}
