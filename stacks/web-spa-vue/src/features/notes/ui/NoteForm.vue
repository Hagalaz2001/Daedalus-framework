<script setup lang="ts">
import { Button, Field, Textarea } from '@app/ui-vue'
import { ref } from 'vue'
import { MAX_NOTE_LENGTH, validateNoteText } from '../model/note'

// Create/edit form. Pass `initialText` + `submitLabel="Save"` for editing once the contract has an update operation.
const props = withDefaults(defineProps<{ initialText?: string; submitLabel?: string; pending?: boolean; error?: string | null; rows?: number; cancellable?: boolean }>(), {
  initialText: '',
  submitLabel: 'Add note',
  rows: 5,
})
const emit = defineEmits<{ submit: [text: string]; cancel: [] }>()
const text = ref(props.initialText)
const touchedError = ref<string>()

function submit() {
  const invalid = validateNoteText(text.value)
  touchedError.value = invalid
  if (!invalid) emit('submit', text.value.trim())
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="submit">
    <Field label="Note" :error="touchedError ?? props.error ?? undefined">
      <template #default="{ fieldProps }">
        <Textarea
          v-bind="fieldProps"
          v-model="text"
          :rows="rows"
          :maxlength="MAX_NOTE_LENGTH + 50"
          placeholder="What is on your mind?"
          @input="touchedError = undefined"
        />
      </template>
      <template #hint>{{ text.length }}/{{ MAX_NOTE_LENGTH }}</template>
    </Field>
    <div class="flex gap-2">
      <Button type="submit" :loading="pending">{{ submitLabel }}</Button>
      <Button v-if="cancellable" type="button" variant="ghost" @click="emit('cancel')">Cancel</Button>
    </div>
  </form>
</template>
