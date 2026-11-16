<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn } from '../lib/cn'
import { controlClass } from './control'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const attrs = useAttrs()
const cls = computed(() => cn(controlClass, 'h-11', attrs['class'] as never))
const rest = computed(() => {
  const { class: _c, ...others } = attrs
  return others
})
</script>

<template>
  <input v-bind="rest" v-model="model" :class="cls" />
</template>
