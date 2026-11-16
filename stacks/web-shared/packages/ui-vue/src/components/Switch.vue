<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useId } from 'vue'

defineProps<{ label: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
const id = useId()
</script>

<template>
  <div class="flex min-h-11 items-center justify-between gap-4 py-2">
    <label :for="id" class="cursor-pointer text-base leading-snug">
      {{ label }}
      <span v-if="$slots['description']" class="block text-sm text-text-muted"><slot name="description" /></span>
    </label>
    <SwitchRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="relative h-7 w-12 shrink-0 rounded-full border border-border bg-surface-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50"
    >
      <SwitchThumb
        class="block size-5 translate-x-0.5 rounded-full bg-text-muted shadow-sm transition-transform data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-on-primary motion-reduce:transition-none"
      />
    </SwitchRoot>
  </div>
</template>
