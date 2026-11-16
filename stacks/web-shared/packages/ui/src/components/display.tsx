'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle } from 'lucide-react'
import { Avatar as A } from 'radix-ui'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Button } from './button'

const badge = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface-muted text-text-muted ring-1 ring-border ring-inset',
      primary: 'bg-primary/12 text-primary',
      success: 'bg-success/12 text-success',
      warning: 'bg-warning/14 text-warning',
      danger: 'bg-danger/12 text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

/** State is never colour alone: always put words (or an icon plus words) inside. */
export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />
}

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' }

export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: keyof typeof sizes; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
  return (
    <A.Root className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/12 font-semibold text-primary select-none', sizes[size], className)}>
      {src && <A.Image src={src} alt="" className="size-full object-cover" />}
      <A.Fallback aria-label={name}>{initials}</A.Fallback>
    </A.Root>
  )
}

/** Placeholder block. Wrap a group in <SkeletonGroup> so assistive tech hears "Loading" once. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none', className)} />
}
export function SkeletonGroup({ label = 'Loading', className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center', className)}>
      {icon && <div className="grid size-12 place-items-center rounded-full bg-surface-muted text-text-muted [&_svg]:size-6">{icon}</div>}
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg border border-danger/35 bg-danger/6 px-6 py-12 text-center', className)}>
      <div className="grid size-12 place-items-center rounded-full bg-danger/12 text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {message && <p className="max-w-sm text-text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  )
}

export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
