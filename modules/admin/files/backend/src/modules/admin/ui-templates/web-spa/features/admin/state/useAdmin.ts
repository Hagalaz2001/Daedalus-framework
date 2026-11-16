import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteRow, listResources, listRows, updateRow } from '../data/adminApi'

export const useResources = () => useQuery({ queryKey: ['admin', 'resources'], queryFn: listResources })

export const useRows = (resource: string, q: string) =>
  useQuery({ queryKey: ['admin', 'rows', resource, q], queryFn: () => listRows(resource, q), enabled: resource !== '' })

export function useUpdateRow(resource: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; values: Record<string, unknown> }) => updateRow(resource, v.id, v.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rows', resource] }),
  })
}

export function useDeleteRow(resource: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRow(resource, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rows', resource] }),
  })
}
