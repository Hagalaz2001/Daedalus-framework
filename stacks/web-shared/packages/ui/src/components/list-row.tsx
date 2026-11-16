import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../lib/cn'

type ListRowProps<T extends ElementType> = {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  /** Render as a router link or button: `<ListRow as={Link} to="/x" .../>`. Defaults to a div. */
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, 'title' | 'as'>

/** One row of a list: leading visual, title/subtitle, trailing meta. 56 px minimum. */
export function ListRow<T extends ElementType = 'div'>({ leading, title, subtitle, trailing, as, className, ...props }: ListRowProps<T>) {
  const Comp: ElementType = as ?? 'div'
  const interactive = as !== undefined
  return (
    <Comp
      className={cn(
        'flex min-h-14 items-center gap-3 px-4 py-2.5 text-left',
        interactive && 'cursor-pointer transition-colors hover:bg-surface-muted focus-visible:-outline-offset-2',
        className,
      )}
      {...props}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-text">{title}</span>
        {subtitle && <span className="block truncate text-sm text-text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm text-text-muted">{trailing}</span>}
    </Comp>
  )
}
