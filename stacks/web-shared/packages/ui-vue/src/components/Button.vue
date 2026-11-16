<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Primitive } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'
import { buttonVariants, type ButtonVariants } from './button-variants'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    loading?: boolean
    disabled?: boolean
    /** Render as the single child you pass (a router link), keeping the button styling. */
    asChild?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { type: 'button' },
)
const attrs = useAttrs()
const cls = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), attrs['class'] as never))
const rest = computed(() => {
  const { class: _c, ...others } = attrs
  return others
})
</script>

<template>
  <Primitive
    v-bind="rest"
    :as="asChild ? undefined : 'button'"
    :as-child="asChild"
    :class="cls"
    :type="asChild ? undefined : type"
    :disabled="asChild ? undefined : disabled || loading"
    :aria-busy="loading || undefined"
  >
    <Loader2 v-if="loading && !asChild" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
    <slot />
  </Primitive>
</template>
