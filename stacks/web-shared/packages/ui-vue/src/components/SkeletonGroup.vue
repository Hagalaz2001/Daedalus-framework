<script setup lang="ts">
// Wrap a group of <Skeleton/> so assistive tech hears "Loading" once.
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading' })
</script>

<template>
  <div role="status" aria-live="polite">
    <span class="sr-only">{{ label }}</span>
    <slot />
  </div>
</template>
