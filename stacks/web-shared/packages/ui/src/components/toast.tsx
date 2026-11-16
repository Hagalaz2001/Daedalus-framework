'use client'

import { Toaster as Sonner, toast } from 'sonner'
import { useTheme } from '../lib/theme'

export { toast }

/** Mount once near the root. Toasts are announced politely by sonner; keep messages short. */
export function Toaster() {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: '!rounded-md !border !border-border !bg-surface !text-text !font-sans',
          description: '!text-text-muted',
          actionButton: '!bg-primary !text-on-primary',
        },
      }}
    />
  )
}
