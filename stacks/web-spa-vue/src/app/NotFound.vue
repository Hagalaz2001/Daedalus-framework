<script setup lang="ts">
import { Button, EmptyState } from '@app/ui-vue'
import { Compass } from '@lucide/vue'
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="mx-auto grid min-h-dvh max-w-lg place-items-center px-6">
    <EmptyState title="Page not found" description="The link may be old, or the page moved.">
      <template #icon><Compass /></template>
      <template #action><Button as-child><RouterLink to="/">Back home</RouterLink></Button></template>
    </EmptyState>
  </main>
</template>
