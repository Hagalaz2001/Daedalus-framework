'use client'

import { Check } from 'lucide-react'
import { Checkbox as C, Switch as Sw, ToggleGroup } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '../lib/cn'

interface ToggleRowProps {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/** Checkbox with its label; the whole row is the 44 px target. */
export function Checkbox({ label, description, checked, onCheckedChange, disabled, className }: ToggleRowProps) {
  const id = useId()
  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-2', className)}>
      <C.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm border border-text-muted/70 bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary disabled:opacity-50"
      >
        <C.Indicator>
          <Check className="size-4" strokeWidth={3} aria-hidden />
        </C.Indicator>
      </C.Root>
      <label htmlFor={id} className="cursor-pointer text-base leading-snug">
        {label}
        {description && <span className="block text-sm text-text-muted">{description}</span>}
      </label>
    </div>
  )
}

export function Switch({ label, description, checked, onCheckedChange, disabled, className }: ToggleRowProps) {
  const id = useId()
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-4 py-2', className)}>
      <label htmlFor={id} className="cursor-pointer text-base leading-snug">
        {label}
        {description && <span className="block text-sm text-text-muted">{description}</span>}
      </label>
      <Sw.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 rounded-full border border-border bg-surface-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50"
      >
        <Sw.Thumb className="block size-5 translate-x-0.5 rounded-full bg-text-muted shadow-sm transition-transform data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-on-primary motion-reduce:transition-none" />
      </Sw.Root>
    </div>
  )
}

export interface SegmentOption {
  value: string
  label: ReactNode
}

/** Single-choice segmented control (theme picker, list filters). */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  options: SegmentOption[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      aria-label={label}
      className={cn('inline-flex rounded-md border border-border bg-surface-muted p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-sm px-3.5 text-sm font-medium text-text-muted transition-colors hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm data-[state=on]:shadow-scrim/10"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
