<script setup lang="ts">
import { Button } from '@app/ui-vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { QuickNote } from '@/features/notes'
import { steps } from '../model/steps'
import { useOnboarding } from '../state/useOnboarded'

const index = ref(0)
const onboarding = useOnboarding()
const router = useRouter()
const step = computed(() => steps[index.value]!)
const last = computed(() => index.value === steps.length - 1)

function finish() {
  onboarding.done = true
  void router.push('/')
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
    <ol class="mb-10 flex gap-2" aria-label="Progress">
      <li v-for="(s, i) in steps" :key="s.id" :aria-current="i === index ? 'step' : undefined" :class="['h-1.5 flex-1 rounded-full', i <= index ? 'bg-primary' : 'bg-border']">
        <span class="sr-only">{{ `Step ${i + 1} of ${steps.length}: ${s.title}` }}</span>
      </li>
    </ol>
    <h1 class="font-display text-4xl font-semibold tracking-tight">{{ step.title }}</h1>
    <p class="mt-3 text-lg text-text-muted">{{ step.body }}</p>
    <div v-if="step.id === 'first'" class="mt-8"><QuickNote placeholder="Try: Buy oat milk" @created="index++" /></div>
    <div class="mt-10 flex items-center gap-3">
      <Button v-if="step.id !== 'first'" size="lg" @click="last ? finish() : index++">{{ last ? 'Go to my notes' : 'Continue' }}</Button>
      <Button v-if="step.id === 'first'" variant="ghost" @click="index++">Skip for now</Button>
      <Button v-if="!last && step.id !== 'first'" variant="ghost" @click="finish">Skip intro</Button>
    </div>
  </main>
</template>
