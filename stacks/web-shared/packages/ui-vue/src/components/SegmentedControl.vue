<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'

// Single-choice segmented control (theme picker, list filters). Options may carry an icon via the `option` slot.
export interface SegmentOption {
  value: string
  label: string
}
defineProps<{ label: string; options: SegmentOption[] }>()
const model = defineModel<string>({ required: true })
function update(v: unknown) {
  if (typeof v === 'string' && v) model.value = v // clicking the active segment must not clear the choice
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="model"
    :aria-label="label"
    class="inline-flex rounded-md border border-border bg-surface-muted p-1"
    @update:model-value="update"
  >
    <ToggleGroupItem
      v-for="o in options"
      :key="o.value"
      :value="o.value"
      class="inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-sm px-3.5 text-sm font-medium text-text-muted transition-colors hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm data-[state=on]:shadow-scrim/10"
    >
      <slot name="option" :option="o">{{ o.label }}</slot>
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
