<script setup lang="ts">
import { useAttrs } from 'vue'
import Field from './Field.vue'
import Input from './Input.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ label: string; hint?: string; error?: string | null }>()
const model = defineModel<string>({ default: '' })
const attrs = useAttrs()
</script>

<template>
  <Field :label="label" :error="error">
    <template #default="{ fieldProps }"><Input v-bind="{ ...attrs, ...fieldProps }" v-model="model" /></template>
    <template v-if="hint" #hint>{{ hint }}</template>
  </Field>
</template>
