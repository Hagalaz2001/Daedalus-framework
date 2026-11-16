import { api, ensureOk, unwrap } from '@/shared/api'

// Everything goes through the generated client (contracts/openapi.yaml: listAdminResources, listAdminRows, ...).
export type AdminRow = Record<string, unknown> & { id: string }

export async function listResources() {
  return unwrap(await api.GET('/admin/resources'), 'Could not load the admin resources.')
}

export async function listRows(resource: string, q: string): Promise<AdminRow[]> {
  const params = { path: { resource }, query: { limit: 50, q: q.trim() || undefined } }
  return unwrap(await api.GET('/admin/{resource}', { params }), 'Could not load rows.') as AdminRow[]
}

export async function updateRow(resource: string, id: string, values: Record<string, unknown>) {
  return unwrap(
    await api.PATCH('/admin/{resource}/{id}', { params: { path: { resource, id } }, body: values }),
    'Could not save the change.',
  )
}

export async function deleteRow(resource: string, id: string): Promise<void> {
  ensureOk(await api.DELETE('/admin/{resource}/{id}', { params: { path: { resource, id } } }), 'Could not delete the row.')
}
