'use client'

import { X } from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

function Overlay() {
  return <D.Overlay data-ui-overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
}

function CloseX() {
  return (
    <D.Close
      aria-label="Close"
      className="absolute top-3 right-3 grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
    >
      <X className="size-5" aria-hidden />
    </D.Close>
  )
}

/** Centered modal. Always include a DialogTitle (screen readers announce it). */
export function DialogContent({ className, children, ...props }: ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        data-ui-dialog
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl shadow-scrim/15',
          className,
        )}
        {...props}
      >
        {children}
        <CloseX />
      </D.Content>
    </D.Portal>
  )
}

/** Edge-anchored panel: right on desktop, bottom on phones. */
export function SheetContent({ className, side = 'right', children, ...props }: ComponentProps<typeof D.Content> & { side?: 'right' | 'bottom' }) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        data-ui-sheet={side}
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-surface p-6 shadow-xl shadow-scrim/15',
          side === 'right'
            ? 'inset-y-0 right-0 w-[min(24rem,100%)] border-l border-border'
            : 'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg border-t border-border',
          className,
        )}
        {...props}
      >
        {children}
        <CloseX />
      </D.Content>
    </D.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof D.Title>) {
  return <D.Title className={cn('pr-10 font-display text-xl font-semibold', className)} {...props} />
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof D.Description>) {
  return <D.Description className={cn('mt-1.5 text-text-muted', className)} {...props} />
}
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}
