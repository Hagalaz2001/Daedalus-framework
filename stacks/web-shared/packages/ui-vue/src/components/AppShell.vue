<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import type { Component } from 'vue'
import Avatar from './Avatar.vue'
import IconButton from './IconButton.vue'
import ThemeToggle from './ThemeToggle.vue'

// Sidebar on desktop, top bar + bottom tab bar on phones. Put at most 5 items in `nav` (the tab bar holds 5).
// `linkAs` is the router's link component taking an `href` prop (see RouterLink in the app); default is <a>.
export interface NavItem {
  href: string
  label: string
  icon: Component
}
const props = defineProps<{
  brand: string
  nav: NavItem[]
  currentPath: string
  linkAs?: string | Component
  user?: { name: string; email?: string; profileHref?: string }
  signOut?: boolean
}>()
defineEmits<{ signOut: [] }>()

const isActive = (href: string) => props.currentPath === href || (href !== '/' && props.currentPath.startsWith(`${href}/`))
const side = 'flex h-11 items-center gap-3 rounded-md px-3 text-[0.95rem] font-medium transition-colors'
</script>

<template>
  <div class="min-h-dvh bg-surface lg:grid lg:grid-cols-[17rem_1fr]">
    <a href="#main" class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>

    <aside class="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface-muted/60 px-4 py-6 lg:flex">
      <div class="px-3 font-display text-xl font-semibold tracking-tight">{{ brand }}</div>
      <nav aria-label="Sidebar" class="mt-8 flex flex-1 flex-col gap-1">
        <component
          :is="linkAs ?? 'a'"
          v-for="item in nav"
          :key="item.href"
          :href="item.href"
          :aria-current="isActive(item.href) ? 'page' : undefined"
          :class="[side, isActive(item.href) ? 'bg-primary/12 text-primary' : 'text-text-muted hover:bg-surface-muted hover:text-text']"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </component>
      </nav>
      <div class="flex items-center gap-1 border-t border-border pt-4">
        <component :is="linkAs ?? 'a'" v-if="user" :href="user.profileHref ?? '#'" class="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 hover:bg-surface-muted">
          <Avatar :name="user.name" size="sm" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium">{{ user.name }}</span>
            <span v-if="user.email" class="block truncate text-xs text-text-muted">{{ user.email }}</span>
          </span>
        </component>
        <ThemeToggle />
        <IconButton v-if="signOut" label="Sign out" @click="$emit('signOut')"><LogOut /></IconButton>
      </div>
    </aside>

    <div class="flex min-w-0 flex-col">
      <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
        <div class="font-display text-lg font-semibold tracking-tight">{{ brand }}</div>
        <div class="flex items-center">
          <ThemeToggle />
          <IconButton v-if="signOut" label="Sign out" @click="$emit('signOut')"><LogOut /></IconButton>
        </div>
      </header>
      <main id="main" class="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 sm:px-8 lg:pt-12 lg:pb-16"><slot /></main>
      <nav aria-label="Tabs" class="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <component
          :is="linkAs ?? 'a'"
          v-for="item in nav"
          :key="item.href"
          :href="item.href"
          :aria-current="isActive(item.href) ? 'page' : undefined"
          :class="['flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium', isActive(item.href) ? 'text-primary' : 'text-text-muted']"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ item.label }}
        </component>
      </nav>
    </div>
  </div>
</template>
