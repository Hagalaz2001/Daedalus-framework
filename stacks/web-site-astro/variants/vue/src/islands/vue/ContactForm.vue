<script setup lang="ts">
import { Button, Field, Input, Textarea } from '@app/ui-vue'
import { CheckCircle2 } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { sendContact, validateContact, type ContactErrors } from '../../lib/contact'

const props = defineProps<{ endpoint: string; send?: typeof sendContact }>()
const values = reactive({ name: '', email: '', message: '' })
const errors = ref<ContactErrors>({})
const failure = ref<string | null>(null)
const busy = ref(false)
const sent = ref(false)

async function submit() {
  errors.value = validateContact(values)
  failure.value = null
  if (Object.keys(errors.value).length) return
  busy.value = true
  const result = await (props.send ?? sendContact)({ ...values }, props.endpoint)
  busy.value = false
  if (result.ok) sent.value = true
  else failure.value = result.message
}
</script>

<template>
  <div v-if="sent" role="status" class="flex items-start gap-4 rounded-lg border border-success/40 bg-success/8 p-6">
    <CheckCircle2 class="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
    <div>
      <p class="font-display text-xl font-semibold">Message sent</p>
      <p class="mt-1 text-text-muted">Thank you. We reply within two working days.</p>
    </div>
  </div>
  <form v-else novalidate class="space-y-5" @submit.prevent="submit">
    <Field label="Name" :error="errors.name">
      <template #default="{ fieldProps }"><Input v-bind="fieldProps" v-model="values.name" name="name" autocomplete="name" /></template>
    </Field>
    <Field label="Email" :error="errors.email">
      <template #default="{ fieldProps }"><Input v-bind="fieldProps" v-model="values.email" name="email" type="email" autocomplete="email" /></template>
    </Field>
    <Field label="How can we help?" :error="errors.message">
      <template #default="{ fieldProps }"><Textarea v-bind="fieldProps" v-model="values.message" name="message" :rows="6" /></template>
    </Field>
    <p v-if="failure" role="alert" class="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-sm font-medium text-danger">{{ failure }}</p>
    <Button type="submit" size="lg" :loading="busy">Send message</Button>
  </form>
</template>
