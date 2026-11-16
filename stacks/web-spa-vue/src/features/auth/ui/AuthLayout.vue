<script setup lang="ts">
import { ThemeToggle } from '@app/ui-vue'
import { watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { appName } from '@/shared/lib/config'
import { useSession } from '../state/useSession'

// Split screen: form on the left (default slot), a quiet brand panel on wide screens. Footer text in the `footer` slot.
defineProps<{ title: string; subtitle?: string }>()

// Public auth screens bounce signed-in users home.
const { user, isPending } = useSession()
const router = useRouter()
watchEffect(() => {
  if (!isPending.value && user.value) void router.replace('/')
})
const cards = [
  { pos: 'left-4 top-10 -rotate-6', w: 'w-56', bg: 'bg-on-primary/15' },
  { pos: 'left-40 top-0 rotate-3', w: 'w-60', bg: 'bg-on-primary/25' },
  { pos: 'left-24 top-32 -rotate-2', w: 'w-64', bg: 'bg-on-primary text-primary shadow-xl shadow-scrim/30' },
]
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <main class="flex flex-col px-6 py-6 sm:px-12">
      <div class="flex items-center justify-between">
        <span class="font-display text-xl font-semibold tracking-tight">{{ appName }}</span>
        <ThemeToggle />
      </div>
      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <h1 class="font-display text-3xl font-semibold tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 text-text-muted">{{ subtitle }}</p>
        <div class="mt-8"><slot /></div>
        <div v-if="$slots['footer']" class="mt-8 text-sm text-text-muted"><slot name="footer" /></div>
      </div>
    </main>
    <aside aria-hidden="true" class="relative hidden overflow-hidden bg-primary text-on-primary lg:block">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklab,var(--color-on-primary)_22%,transparent),transparent_55%)]" />
      <div class="relative flex h-full flex-col justify-between p-16">
        <div class="relative mt-8 h-72">
          <div v-for="(c, i) in cards" :key="i" :class="['absolute space-y-2.5 rounded-lg p-5', c.pos, c.w, c.bg]">
            <div :class="['h-2.5 w-2/3 rounded-full', i === 2 ? 'bg-primary' : 'bg-on-primary/60']" />
            <div :class="['h-2 rounded-full', i === 2 ? 'bg-primary/25' : 'bg-on-primary/30']" />
            <div :class="['h-2 w-4/5 rounded-full', i === 2 ? 'bg-primary/25' : 'bg-on-primary/30']" />
          </div>
        </div>
        <p class="max-w-md font-display text-4xl leading-tight font-medium tracking-tight">Write it down once. Find it when it matters.</p>
      </div>
    </aside>
  </div>
</template>
