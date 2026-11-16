import { cva, type VariantProps } from 'class-variance-authority'

// Same recipe as the React kit (shadcn/ui button pattern), so both kits look identical. Targets are 44/48 px.
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

export type ButtonVariants = VariantProps<typeof buttonVariants>
