<script setup lang="ts">
// Actions go in the `actions` slot.
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-1.5 max-w-prose text-text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots['actions']" class="flex items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
