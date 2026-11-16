<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import Button from './Button.vue'

withDefaults(defineProps<{ title?: string; message?: string; retryable?: boolean }>(), { title: 'Something went wrong' })
defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="flex flex-col items-center gap-3 rounded-lg border border-danger/35 bg-danger/6 px-6 py-12 text-center">
    <div class="grid size-12 place-items-center rounded-full bg-danger/12 text-danger"><AlertTriangle class="size-6" aria-hidden="true" /></div>
    <h2 class="font-display text-xl font-semibold">{{ title }}</h2>
    <p v-if="message" class="max-w-sm text-text-muted">{{ message }}</p>
    <Button v-if="retryable" variant="secondary" class="mt-2" @click="$emit('retry')">Try again</Button>
  </div>
</template>
