<script setup lang="ts">
import { Button, TextField } from '@app/ui-vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { validateCredentials, type FieldErrors } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import AuthLayout from './AuthLayout.vue'

const { signIn } = useAuthActions()
const router = useRouter()
const email = ref('')
const password = ref('')
const errors = ref<FieldErrors>({})
const formError = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  errors.value = validateCredentials({ email: email.value, password: password.value }, 'sign-in')
  formError.value = null
  if (Object.keys(errors.value).length) return
  busy.value = true
  const error = await signIn(email.value, password.value)
  busy.value = false
  if (error) formError.value = error
  else void router.push('/')
}
</script>

<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off.">
    <form class="space-y-5" novalidate @submit.prevent="submit">
      <TextField v-model="email" label="Email" type="email" autocomplete="email" :error="errors.email" />
      <TextField v-model="password" label="Password" type="password" autocomplete="current-password" :error="errors.password" />
      <div class="-mt-2 text-right">
        <RouterLink to="/forgot-password" class="text-sm font-medium text-primary underline underline-offset-4">Forgot password?</RouterLink>
      </div>
      <p v-if="formError" role="alert" class="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">{{ formError }}</p>
      <Button type="submit" size="lg" class="w-full" :loading="busy">Sign in</Button>
    </form>
    <template #footer>
      New here?
      <RouterLink to="/sign-up" class="font-medium text-primary underline underline-offset-4">Create an account</RouterLink>
    </template>
  </AuthLayout>
</template>
