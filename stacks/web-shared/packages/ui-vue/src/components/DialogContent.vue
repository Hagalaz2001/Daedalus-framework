<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'

// Centered modal. Always include a DialogTitle (screen readers announce it); add a DialogDescription or
// pass aria-describedby="" when there is none.
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const cls = computed(() =>
  cn(
    'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl shadow-scrim/15',
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
    <DialogContent v-bind="rest" data-ui-dialog :class="cls">
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
