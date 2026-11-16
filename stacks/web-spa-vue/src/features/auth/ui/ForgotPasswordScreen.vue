<script setup lang="ts">
import { Button, TextField } from '@app/ui-vue'
import { MailCheck } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { validateEmail } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import AuthLayout from './AuthLayout.vue'

const { requestPasswordReset } = useAuthActions()
const email = ref('')
const error = ref<string | null>(null)
const sent = ref(false)
const busy = ref(false)

async function submit() {
  const invalid = validateEmail(email.value)
  error.value = invalid ?? null
  if (invalid) return
  busy.value = true
  const failure = await requestPasswordReset(email.value)
  busy.value = false
  if (failure) error.value = failure
  else sent.value = true
}
</script>

<template>
  <AuthLayout v-if="sent" title="Check your inbox" :subtitle="`If an account exists for ${email.trim()}, a reset link is on its way.`">
    <div role="status" class="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-4 text-sm">
      <MailCheck class="size-5 shrink-0 text-success" aria-hidden="true" />
      The link expires in one hour.
    </div>
    <template #footer><RouterLink to="/sign-in" class="font-medium text-primary underline underline-offset-4">Back to sign in</RouterLink></template>
  </AuthLayout>
  <AuthLayout v-else title="Reset your password" subtitle="Enter your email and we will send you a link.">
    <form class="space-y-5" novalidate @submit.prevent="submit">
      <TextField v-model="email" label="Email" type="email" autocomplete="email" :error="error" />
      <Button type="submit" size="lg" class="w-full" :loading="busy">Send reset link</Button>
    </form>
    <template #footer><RouterLink to="/sign-in" class="font-medium text-primary underline underline-offset-4">Back to sign in</RouterLink></template>
  </AuthLayout>
</template>
