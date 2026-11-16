<script setup lang="ts">
import { AppShell, Skeleton } from '@app/ui-vue'
import { Home, NotebookPen, Settings, User } from '@lucide/vue'
import { watchEffect } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthActions, useSession } from '@/features/auth'
import { isOnboarded } from '@/features/onboarding'
import { appName } from '@/shared/lib/config'
import { RouterLink } from '@/shared/ui'

// Signed-in area: redirects to sign-in, and sends brand-new users through onboarding once.
const nav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
]
const { user, isPending } = useSession()
const { signOut } = useAuthActions()
const route = useRoute()
const router = useRouter()

watchEffect(() => {
  if (isPending.value) return
  if (!user.value) void router.replace('/sign-in')
  else if (!isOnboarded() && route.path !== '/welcome') void router.replace('/welcome')
})
</script>

<template>
  <div v-if="isPending || !user" class="p-8" role="status">
    <span class="sr-only">Loading</span>
    <Skeleton class="h-8 w-48" />
  </div>
  <RouterView v-else-if="route.path === '/welcome'" />
  <AppShell
    v-else
    :brand="appName"
    :nav="nav"
    :current-path="route.path"
    :link-as="RouterLink"
    :user="{ name: user.name, email: user.email, profileHref: '/profile' }"
    sign-out
    @sign-out="signOut()"
  >
    <RouterView />
  </AppShell>
</template>
