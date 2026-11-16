import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { Slot } from 'radix-ui'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../lib/cn'

// Adapted from the shadcn/ui button recipe (cva + Slot), re-themed with design tokens. Targets are 44/48 px.
export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80',
        secondary: 'border border-border bg-surface text-text hover:bg-surface-muted',
        ghost: 'text-text hover:bg-surface-muted',
        danger: 'bg-danger text-surface hover:bg-danger/90',
        link: 'h-auto min-h-0 rounded-sm px-0 text-primary underline underline-offset-4 hover:no-underline',
      },
      size: { md: 'h-11 px-5 text-[0.95rem]', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ className, variant, size, asChild, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      type={asChild ? undefined : type}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size' | 'aria-label'> {
  /** Required: icon-only controls need an accessible name. */
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, className, variant = 'ghost', ...props }: IconButtonProps) {
  return (
    <Button variant={variant} aria-label={label} title={label} className={cn('size-11 p-0', className)} {...props}>
      {icon}
    </Button>
  )
}
