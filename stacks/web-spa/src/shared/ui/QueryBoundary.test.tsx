import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryBoundary } from './QueryBoundary'

const q = (p: Partial<UseQueryResult<string[], Error>>) => ({ refetch: vi.fn(), ...p }) as UseQueryResult<string[], Error>

describe('QueryBoundary', () => {
  it('renders loading, error (with retry), empty and content', async () => {
    const loading = <p>skeleton</p>
    const empty = <p>nothing</p>
    const { rerender } = render(<QueryBoundary query={q({ isPending: true, isError: false })} loading={loading}>{() => null}</QueryBoundary>)
    expect(screen.getByText('skeleton')).toBeInTheDocument()

    const refetch = vi.fn()
    rerender(<QueryBoundary query={q({ isPending: false, isError: true, error: new Error('boom'), refetch })} loading={loading}>{() => null}</QueryBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()

    const ok = q({ isPending: false, isError: false, data: [] })
    rerender(<QueryBoundary query={ok} loading={loading} empty={empty} isEmpty={(d) => d.length === 0}>{() => <p>content</p>}</QueryBoundary>)
    expect(screen.getByText('nothing')).toBeInTheDocument()

    rerender(<QueryBoundary query={q({ isPending: false, isError: false, data: ['a'] })} loading={loading} empty={empty} isEmpty={(d) => d.length === 0}>{(d) => <p>{d[0]}</p>}</QueryBoundary>)
    expect(screen.getByText('a')).toBeInTheDocument()
  })
})
