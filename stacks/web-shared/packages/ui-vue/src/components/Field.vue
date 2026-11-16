<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'

// Label + hint + error wiring. The default slot receives { fieldProps: { id, aria-describedby, aria-invalid } }: bind it to your control
// with v-bind (<Field label="Email" v-slot="{ fieldProps }"><Input v-bind="fieldProps" /></Field>). Put a hint in the `hint` slot.
const props = defineProps<{ label: string; error?: string | null }>()
const slots = useSlots()
const id = useId()
const describedBy = computed(() => [slots['hint'] ? `${id}-hint` : null, props.error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-text">{{ label }}</label>
    <slot :field-props="{ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }" />
    <p v-if="$slots['hint']" :id="`${id}-hint`" class="text-sm text-text-muted"><slot name="hint" /></p>
    <p v-if="error" :id="`${id}-error`" role="alert" class="text-sm font-medium text-danger">{{ error }}</p>
  </div>
</template>
