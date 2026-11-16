import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState } from '@app/ui'
import type { ReactNode } from 'react'

/**
 * Every data screen goes through this: loading -> skeleton, failure -> error with retry, no data -> empty state,
 * otherwise the content. Keeps the three states from being forgotten.
 */
export function QueryBoundary<T>({
  query,
  loading,
  empty,
  isEmpty,
  children,
}: {
  query: UseQueryResult<T, Error>
  loading: ReactNode
  empty?: ReactNode
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}) {
  if (query.isPending) return <>{loading}</>
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
  if (empty && isEmpty?.(query.data)) return <>{empty}</>
  return <>{children(query.data)}</>
}
