'use client'

import { Tabs as T } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const Tabs = T.Root

export function TabsList({ className, ...props }: ComponentProps<typeof T.List>) {
  return <T.List className={cn('flex gap-1 border-b border-border', className)} {...props} />
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        '-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-4 text-[0.95rem] font-medium text-text-muted transition-colors hover:text-text data-[state=active]:border-primary data-[state=active]:text-text',
        className,
      )}
      {...props}
    />
  )
}
export function TabsContent({ className, ...props }: ComponentProps<typeof T.Content>) {
  return <T.Content className={cn('pt-6', className)} {...props} />
}
