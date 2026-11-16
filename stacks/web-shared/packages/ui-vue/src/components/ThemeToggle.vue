<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'
import { computed } from 'vue'
import { useTheme, type ThemeChoice } from '../lib/theme'
import IconButton from './IconButton.vue'

// Cycles system -> light -> dark. The label always says what the next press does.
const order: ThemeChoice[] = ['system', 'light', 'dark']
const { choice, setTheme } = useTheme()
const next = computed(() => order[(order.indexOf(choice.value) + 1) % order.length]!)
const icons = { system: Monitor, light: Sun, dark: Moon }
</script>

<template>
  <IconButton :label="`Theme: ${choice}. Switch to ${next}`" @click="setTheme(next)">
    <component :is="icons[choice]" aria-hidden="true" />
  </IconButton>
</template>
