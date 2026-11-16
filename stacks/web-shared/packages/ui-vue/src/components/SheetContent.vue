<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'

// Edge-anchored panel: right on desktop (side="right") or bottom on phones (side="bottom").
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ side?: 'right' | 'bottom' }>(), { side: 'right' })
const attrs = useAttrs()
const cls = computed(() =>
  cn(
    'fixed z-50 flex flex-col gap-4 bg-surface p-6 shadow-xl shadow-scrim/15',
    props.side === 'right'
      ? 'inset-y-0 right-0 w-[min(24rem,100%)] border-l border-border'
      : 'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg border-t border-border',
    attrs['class'] as never,
  ),
)
const rest = computed(() => {
  const { class: _c, ...others } = attrs
  return others
})
</script>

<template>
  <DialogPortal>
    <DialogOverlay data-ui-overlay class="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
    <DialogContent v-bind="rest" :data-ui-sheet="side" :class="cls">
      <slot />
      <DialogClose
        aria-label="Close"
        class="absolute top-3 right-3 grid size-11 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        <X class="size-5" aria-hidden="true" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
