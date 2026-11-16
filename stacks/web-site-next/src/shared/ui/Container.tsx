import { cn } from '@app/ui'
import type { ElementType, HTMLAttributes } from 'react'

export function Container({ as: Tag = 'div', className, ...props }: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return <Tag className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)} {...props} />
}
