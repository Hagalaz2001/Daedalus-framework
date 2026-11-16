<script setup lang="ts">
import {
  Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, EmptyState, PageHeader, Skeleton, SkeletonGroup, toast,
} from '@app/ui-vue'
import { ArrowLeft, FileQuestion, Trash2 } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Note } from '@/shared/api'
import { formatDate } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { noteTitle } from '../model/note'
import { useDeleteNote, useNotes } from '../state/useNotes'

// The contract has no GET /notes/{id}, so the detail is read from the cached list. Add the operation
// to contracts/openapi.yaml and swap this query when notes get heavy.
const route = useRoute()
const router = useRouter()
const query = useNotes()
const remove = useDeleteNote()
const confirm = ref(false)
const find = (notes: Note[]) => notes.find((n) => n.id === route.params['id'])

function doDelete(id: string) {
  remove.mutate(id, {
    onSuccess: () => {
      toast.success('Note deleted')
      void router.push('/notes')
    },
    onError: (e) => toast.error(e.message),
  })
}
</script>

<template>
  <Button as-child variant="link" class="mb-6">
    <RouterLink to="/notes"><ArrowLeft aria-hidden="true" />All notes</RouterLink>
  </Button>
  <QueryBoundary :query="query">
    <template #loading>
      <SkeletonGroup label="Loading note" class="space-y-4">
        <Skeleton class="h-9 w-2/3" />
        <Skeleton class="h-40 w-full" />
      </SkeletonGroup>
    </template>
    <template #default="{ data }">
      <template v-if="find(data)">
        <PageHeader :title="noteTitle(find(data)!)" :description="formatDate(find(data)!.createdAt)">
          <template #actions>
            <Button variant="secondary" @click="confirm = true"><Trash2 aria-hidden="true" />Delete</Button>
          </template>
        </PageHeader>
        <Card>
          <CardContent><p class="text-lg leading-relaxed break-words whitespace-pre-wrap">{{ find(data)!.text }}</p></CardContent>
        </Card>
        <Dialog v-model:open="confirm">
          <DialogContent>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>It will be removed for good. This cannot be undone.</DialogDescription>
            <DialogFooter>
              <Button variant="ghost" @click="confirm = false">Keep it</Button>
              <Button variant="danger" :loading="remove.isPending.value" @click="doDelete(find(data)!.id)">Delete note</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </template>
      <EmptyState v-else title="That note is gone" description="It may have been deleted on another device.">
        <template #icon><FileQuestion /></template>
        <template #action><Button as-child variant="secondary"><RouterLink to="/notes">Back to notes</RouterLink></Button></template>
      </EmptyState>
    </template>
  </QueryBoundary>
</template>
