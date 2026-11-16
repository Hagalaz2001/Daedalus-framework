<script setup lang="ts">
import { computed, useAttrs, type Component } from 'vue'
import { cn } from '../lib/cn'

// One row of a list: leading visual, title/subtitle, trailing meta. 56 px minimum.
// `as` renders it as a router link or button (<ListRow :as="RouterLink" to="/x" ... />); default is a div.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ title: string; subtitle?: string; as?: string | Component }>()
const attrs = useAttrs()
const cls = computed(() =>
  cn('flex min-h-14 items-center gap-3 px-4 py-2.5 text-left', props.as && 'cursor-pointer transition-colors hover:bg-surface-muted focus-visible:-outline-offset-2', attrs['class'] as never),
)
const rest = computed(() => {
  const { class: _c, ...others } = attrs
  return others
})
</script>

<template>
  <component :is="as ?? 'div'" v-bind="rest" :class="cls">
    <span v-if="$slots['leading']" class="shrink-0"><slot name="leading" /></span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-base font-medium text-text">{{ title }}</span>
      <span v-if="subtitle" class="block truncate text-sm text-text-muted">{{ subtitle }}</span>
    </span>
    <span v-if="$slots['trailing']" class="shrink-0 text-sm text-text-muted"><slot name="trailing" /></span>
  </component>
</template>
