<script setup lang="ts">
import { Button, Input, toast } from '@app/ui-vue'
import { Plus } from '@lucide/vue'
import { ref } from 'vue'
import { validateNoteText } from '../model/note'
import { useCreateNote } from '../state/useNotes'

// One-line capture box (dashboard, onboarding).
withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Write a note and press Enter' })
const emit = defineEmits<{ created: [] }>()
const create = useCreateNote()
const text = ref('')
const error = ref<string>()

function submit() {
  const invalid = validateNoteText(text.value)
  error.value = invalid
  if (invalid) return
  create.mutate(text.value, {
    onSuccess: () => {
      text.value = ''
      toast.success('Note saved')
      emit('created')
    },
    onError: (err) => (error.value = err.message),
  })
}
</script>

<template>
  <form class="flex flex-col gap-2" novalidate @submit.prevent="submit">
    <div class="flex gap-2">
      <Input
        v-model="text"
        aria-label="New note"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? 'quick-note-error' : undefined"
        :placeholder="placeholder"
        @input="error = undefined"
      />
      <Button type="submit" :loading="create.isPending.value" class="shrink-0"><Plus aria-hidden="true" />Add</Button>
    </div>
    <p v-if="error" id="quick-note-error" role="alert" class="text-sm font-medium text-danger">{{ error }}</p>
  </form>
</template>
