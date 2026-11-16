<script setup lang="ts">
// Icon in the `icon` slot, call to action in the `action` slot.
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
    <div v-if="$slots['icon']" class="grid size-12 place-items-center rounded-full bg-surface-muted text-text-muted [&_svg]:size-6"><slot name="icon" /></div>
    <h2 class="font-display text-xl font-semibold">{{ title }}</h2>
    <p v-if="description" class="max-w-sm text-text-muted">{{ description }}</p>
    <div v-if="$slots['action']" class="mt-2"><slot name="action" /></div>
  </div>
</template>
