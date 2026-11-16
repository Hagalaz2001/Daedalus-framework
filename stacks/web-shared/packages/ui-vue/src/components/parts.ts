import { styled } from '../lib/styled'

// Plain styled containers (no behaviour), same classes as the React kit.
export const Card = styled('div', 'rounded-lg border border-border bg-surface text-text')
export const CardHeader = styled('div', 'flex flex-col gap-1 p-5 pb-0')
export const CardTitle = styled('h2', 'font-display text-lg font-semibold leading-snug')
export const CardDescription = styled('p', 'text-sm text-text-muted')
export const CardContent = styled('div', 'p-5')
export const CardFooter = styled('div', 'flex items-center gap-3 border-t border-border p-4')
export const DialogFooter = styled('div', 'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end')
