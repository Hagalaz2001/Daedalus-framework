<script setup lang="ts">
import { Button, TextField } from '@app/ui-vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { MIN_PASSWORD, validateCredentials, type FieldErrors } from '../model/validation'
import { useAuthActions } from '../state/useAuthActions'
import AuthLayout from './AuthLayout.vue'

const { signUp } = useAuthActions()
const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const errors = ref<FieldErrors>({})
const formError = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  errors.value = validateCredentials({ name: name.value, email: email.value, password: password.value }, 'sign-up')
  formError.value = null
  if (Object.keys(errors.value).length) return
  busy.value = true
  const error = await signUp(name.value, email.value, password.value)
  busy.value = false
  if (error) formError.value = error
  else void router.push('/welcome')
}
</script>

<template>
  <AuthLayout title="Create your account" subtitle="Free to start. No card needed.">
    <form class="space-y-5" novalidate @submit.prevent="submit">
      <TextField v-model="name" label="Name" autocomplete="name" :error="errors.name" />
      <TextField v-model="email" label="Email" type="email" autocomplete="email" :error="errors.email" />
      <TextField v-model="password" label="Password" type="password" autocomplete="new-password" :hint="`At least ${MIN_PASSWORD} characters.`" :error="errors.password" />
      <p v-if="formError" role="alert" class="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">{{ formError }}</p>
      <Button type="submit" size="lg" class="w-full" :loading="busy">Create account</Button>
    </form>
    <template #footer>
      Already have an account?
      <RouterLink to="/sign-in" class="font-medium text-primary underline underline-offset-4">Sign in</RouterLink>
    </template>
  </AuthLayout>
</template>
