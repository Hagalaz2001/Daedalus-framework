<script setup lang="ts" generic="T">
import { ErrorState } from '@app/ui-vue'
import type { UseQueryReturnType } from '@tanstack/vue-query'
import { computed } from 'vue'

// Every data screen goes through this: loading -> `loading` slot, failure -> error with retry, no data -> `empty` slot
// (when `isEmpty` says so), otherwise the default slot with the data. Keeps the three states from being forgotten.
const props = defineProps<{ query: UseQueryReturnType<T, Error>; isEmpty?: (data: T) => boolean }>()
const data = computed(() => props.query.data.value as T | undefined)
const showEmpty = computed(() => data.value !== undefined && !!props.isEmpty?.(data.value))
</script>

<template>
  <slot v-if="query.isPending.value" name="loading" />
  <ErrorState v-else-if="query.isError.value" :message="query.error.value?.message" retryable @retry="query.refetch()" />
  <slot v-else-if="showEmpty" name="empty" />
  <slot v-else :data="data as T" />
</template>
