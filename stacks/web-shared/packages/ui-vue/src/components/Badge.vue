<script setup lang="ts">
import { computed } from 'vue'

// State is never colour alone: always put words (or an icon plus words) inside.
const props = withDefaults(defineProps<{ tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }>(), { tone: 'neutral' })
const tones = {
  neutral: 'bg-surface-muted text-text-muted ring-1 ring-border ring-inset',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/14 text-warning',
  danger: 'bg-danger/12 text-danger',
}
const cls = computed(() => tones[props.tone])
</script>

<template>
  <span :class="['inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', cls]"><slot /></span>
</template>
