<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'
import Button from './Button.vue'
import type { ButtonVariants } from './button-variants'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ label: string; variant?: ButtonVariants['variant']; loading?: boolean; disabled?: boolean }>(), { variant: 'ghost' })
const attrs = useAttrs()
const cls = computed(() => cn('size-11 p-0', attrs['class'] as never))
</script>

<!-- Icon-only control: `label` is required so it always has an accessible name. Put the icon in the default slot. -->
<template>
  <Button v-bind="{ ...attrs, class: undefined }" :variant="props.variant" :loading="loading" :disabled="disabled" :aria-label="label" :title="label" :class="cls">
    <slot />
  </Button>
</template>
