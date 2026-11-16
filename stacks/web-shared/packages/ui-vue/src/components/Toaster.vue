<script setup lang="ts">
import { Toaster as Sonner } from 'vue-sonner'
import { useTheme } from '../lib/theme'

// Mount once near the root. Toasts are announced politely by vue-sonner; keep messages short.
const { resolved } = useTheme()
</script>

<template>
  <Sonner
    :theme="resolved"
    position="bottom-right"
    :toast-options="{
      classes: {
        toast: '!rounded-md !border !border-border !bg-surface !text-text !font-sans',
        description: '!text-text-muted',
        actionButton: '!bg-primary !text-on-primary',
      },
    }"
  />
</template>
