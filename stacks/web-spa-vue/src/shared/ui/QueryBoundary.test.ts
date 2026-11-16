import type { UseQueryReturnType } from '@tanstack/vue-query'
import { render, screen } from '@app/ui-vue/testing'
import userEvent from '@testing-library/user-event'
import { h, ref } from 'vue'
import QueryBoundary from './QueryBoundary.vue'

const q = (p: { pending?: boolean; error?: Error; data?: string[]; refetch?: () => void }) =>
  ({ isPending: ref(!!p.pending), isError: ref(!!p.error), error: ref(p.error ?? null), data: ref(p.data), refetch: p.refetch ?? vi.fn() }) as unknown as UseQueryReturnType<string[], Error>

const slots = { loading: () => h('p', 'skeleton'), empty: () => h('p', 'nothing'), default: ({ data }: { data: string[] }) => h('p', data[0]) }
const mount = (query: UseQueryReturnType<string[], Error>) => render(QueryBoundary, { props: { query, isEmpty: (d: unknown) => (d as string[]).length === 0 }, slots })

describe('QueryBoundary', () => {
  it('renders loading, error (with retry), empty and content', async () => {
    mount(q({ pending: true }))
    expect(screen.getByText('skeleton')).toBeInTheDocument()
  })
  it('error state offers retry', async () => {
    const refetch = vi.fn()
    mount(q({ error: new Error('boom'), refetch }))
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
  it('empty and content', () => {
    const a = mount(q({ data: [] }))
    expect(screen.getByText('nothing')).toBeInTheDocument()
    a.unmount()
    mount(q({ data: ['a'] }))
    expect(screen.getByText('a')).toBeInTheDocument()
  })
})
