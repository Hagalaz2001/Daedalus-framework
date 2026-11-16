'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select as S } from 'radix-ui'
import { cn } from '../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  ...aria
}: {
  value?: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  id?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}) {
  return (
    <S.Root value={value} onValueChange={onValueChange}>
      <S.Trigger
        className={cn(
          'inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3.5 text-base text-text transition-colors hover:border-text-muted/60 data-[placeholder]:text-text-muted aria-[invalid=true]:border-danger',
          className,
        )}
        {...aria}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDown className="size-4 text-text-muted" aria-hidden />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          data-ui-popover
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface p-1 text-text shadow-lg shadow-scrim/10"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                className="relative flex min-h-11 cursor-default select-none items-center rounded-sm py-2 pr-9 pl-3 text-base outline-none data-[highlighted]:bg-surface-muted data-[state=checked]:font-medium"
              >
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-3">
                  <Check className="size-4 text-primary" aria-hidden />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  )
}
