<script setup lang="ts">
import {
  Avatar, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger,
  PageHeader, Skeleton, SkeletonGroup, TextField, toast,
} from '@app/ui-vue'
import { LogOut, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthActions, useSession } from '@/features/auth'
import { canDelete, DELETE_PHRASE } from '../model/delete'

const { user, isPending } = useSession()
const { updateName, signOut, deleteAccount } = useAuthActions()
const router = useRouter()
const name = ref<string>()
const nameError = ref<string | null>(null)
const saving = ref(false)
const typed = ref('')
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const current = computed(() => name.value ?? user.value?.name ?? '')

async function save() {
  if (!current.value.trim()) {
    nameError.value = 'Name cannot be empty.'
    return
  }
  saving.value = true
  const error = await updateName(current.value)
  saving.value = false
  nameError.value = error
  if (!error) toast.success('Profile updated')
}

async function remove() {
  deleting.value = true
  const error = await deleteAccount()
  deleting.value = false
  if (error) deleteError.value = error
  else void router.push('/sign-in')
}

function resetDelete() {
  typed.value = ''
  deleteError.value = null
}
</script>

<template>
  <SkeletonGroup v-if="isPending || !user" label="Loading profile" class="space-y-4">
    <Skeleton class="h-10 w-1/2" />
    <Skeleton class="h-48" />
  </SkeletonGroup>
  <template v-else>
    <PageHeader title="Profile">
      <template #actions>
        <Button variant="secondary" @click="signOut()"><LogOut aria-hidden="true" />Sign out</Button>
      </template>
    </PageHeader>
    <div class="max-w-xl space-y-8">
      <Card>
        <CardContent>
          <div class="mb-6 flex items-center gap-4">
            <Avatar :name="user.name" size="lg" />
            <div class="min-w-0">
              <p class="truncate font-display text-xl font-semibold">{{ user.name }}</p>
              <p class="truncate text-text-muted">{{ user.email }}</p>
            </div>
          </div>
          <form class="space-y-4" novalidate @submit.prevent="save">
            <TextField :model-value="current" label="Display name" autocomplete="name" :error="nameError" @update:model-value="name = $event" />
            <Button type="submit" :loading="saving" :disabled="current.trim() === user.name">Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card class="border-danger/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>Permanently removes your account and every note in it. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog @update:open="resetDelete">
            <DialogTrigger as-child>
              <Button variant="danger"><Trash2 aria-hidden="true" />Delete my account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>Type <strong class="font-mono text-text">{{ DELETE_PHRASE }}</strong> to confirm.</DialogDescription>
              <div class="mt-4"><TextField v-model="typed" label="Confirmation" autocomplete="off" :error="deleteError" /></div>
              <DialogFooter>
                <Button variant="danger" :disabled="!canDelete(typed)" :loading="deleting" @click="remove">Delete forever</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  </template>
</template>
