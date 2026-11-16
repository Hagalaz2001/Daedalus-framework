<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' }
const initials = computed(
  () =>
    props.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?',
)
</script>

<template>
  <AvatarRoot :class="['inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full bg-primary/12 font-semibold text-primary', sizes[size]]">
    <AvatarImage v-if="src" :src="src" alt="" class="size-full object-cover" />
    <AvatarFallback :aria-label="name">{{ initials }}</AvatarFallback>
  </AvatarRoot>
</template>
