<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { useId } from 'vue'

// Checkbox with its label; the whole row is the 44 px target. Description goes in the `description` slot.
defineProps<{ label: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
const id = useId()
</script>

<template>
  <div class="flex min-h-11 items-start gap-3 py-2">
    <CheckboxRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm border border-text-muted/70 bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary disabled:opacity-50"
    >
      <CheckboxIndicator><Check class="size-4" :stroke-width="3" aria-hidden="true" /></CheckboxIndicator>
    </CheckboxRoot>
    <label :for="id" class="cursor-pointer text-base leading-snug">
      {{ label }}
      <span v-if="$slots['description']" class="block text-sm text-text-muted"><slot name="description" /></span>
    </label>
  </div>
</template>
