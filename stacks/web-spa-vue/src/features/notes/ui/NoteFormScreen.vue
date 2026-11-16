<script setup lang="ts">
import { Button, PageHeader, toast } from '@app/ui-vue'
import { ArrowLeft } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCreateNote } from '../state/useNotes'
import NoteForm from './NoteForm.vue'

const create = useCreateNote()
const router = useRouter()
function save(text: string) {
  create.mutate(text, {
    onSuccess: (note) => {
      toast.success('Note saved')
      void router.push(`/notes/${note.id}`)
    },
  })
}
</script>

<template>
  <Button as-child variant="link" class="mb-6">
    <RouterLink to="/notes"><ArrowLeft aria-hidden="true" />All notes</RouterLink>
  </Button>
  <PageHeader title="New note" description="Plain text, up to 500 characters." />
  <div class="max-w-xl">
    <NoteForm :pending="create.isPending.value" :error="create.error.value?.message" cancellable @cancel="router.push('/notes')" @submit="save" />
  </div>
</template>
