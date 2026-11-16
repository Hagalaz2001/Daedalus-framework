<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'

defineOptions({ inheritAttrs: false })
export interface SelectOption {
  value: string
  label: string
}
defineProps<{ options: SelectOption[]; placeholder?: string }>()
const model = defineModel<string>()
const attrs = useAttrs()
const cls = computed(() =>
  cn(
    'inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3.5 text-base text-text transition-colors hover:border-text-muted/60 data-[placeholder]:text-text-muted aria-[invalid=true]:border-danger',
    attrs['class'] as never,
  ),
)
const rest = computed(() => {
  const { class: _c, ...others } = attrs
  return others
})
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger v-bind="rest" :class="cls">
      <SelectValue :placeholder="placeholder" />
      <SelectIcon><ChevronDown class="size-4 text-text-muted" aria-hidden="true" /></SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        data-ui-popover
        class="z-50 max-h-72 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface p-1 text-text shadow-lg shadow-scrim/10"
      >
        <SelectViewport>
          <SelectItem
            v-for="o in options"
            :key="o.value"
            :value="o.value"
            class="relative flex min-h-11 cursor-default select-none items-center rounded-sm py-2 pr-9 pl-3 text-base outline-none data-[highlighted]:bg-surface-muted data-[state=checked]:font-medium"
          >
            <SelectItemText>{{ o.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-3"><Check class="size-4 text-primary" aria-hidden="true" /></SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
