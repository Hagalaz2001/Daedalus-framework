<script setup lang="ts">
import { Button, EmptyState, ListRow, PageHeader, Skeleton, SkeletonGroup } from '@app/ui-vue'
import { ArrowRight, Sparkles } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useSession } from '@/features/auth'
import { noteTitle, QuickNote, useNotes } from '@/features/notes'
import { timeAgo } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { computeStats, dailyCounts, greeting } from '../model/stats'

const { user } = useSession()
const query = useNotes()
const title = computed(() => {
  const first = user.value?.name.split(' ')[0]
  return `${greeting()}${first ? `, ${first}` : ''}`
})
const stats = (created: string[]) => {
  const s = computeStats(created)
  return [
    ['All', s.total],
    ['Week', s.thisWeek],
    ['Today', s.today],
  ] as const
}
const bars = (created: string[]) => {
  const counts = dailyCounts(created)
  const max = Math.max(1, ...counts)
  return counts.map((c, i) => ({ c, last: i === counts.length - 1, h: Math.max(8, (c / max) * 100) }))
}
</script>

<template>
  <PageHeader :title="title" description="Here is where your notes stand." />
  <section aria-label="Quick note" class="mb-10"><QuickNote /></section>

  <QueryBoundary :query="query" :is-empty="(d) => d.length === 0">
    <template #loading>
      <SkeletonGroup label="Loading dashboard" class="space-y-8">
        <Skeleton class="h-36" />
        <Skeleton class="h-48" />
      </SkeletonGroup>
    </template>
    <template #empty>
      <EmptyState title="A blank page, ready when you are" description="Add your first note above and your numbers will show up here.">
        <template #icon><Sparkles /></template>
      </EmptyState>
    </template>
    <template #default="{ data }">
      <section aria-label="Activity" class="mb-10 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-12">
        <dl class="grid grid-cols-3 gap-8">
          <div v-for="[label, value] in stats(data.map((n) => n.createdAt))" :key="label">
            <dt class="text-sm text-text-muted">{{ label }}</dt>
            <dd class="font-display text-5xl font-semibold tabular-nums">{{ value }}</dd>
          </div>
        </dl>
        <div>
          <p class="mb-2 text-sm text-text-muted">Last 14 days</p>
          <div role="img" aria-label="Notes per day over the last 14 days" class="flex h-16 items-end gap-1.5">
            <div
              v-for="(b, i) in bars(data.map((n) => n.createdAt))"
              :key="i"
              :class="['flex-1 rounded-sm', b.last ? 'bg-primary' : 'bg-primary/25']"
              :style="{ height: `${b.h}%`, opacity: b.c === 0 ? 0.45 : 1 }"
            />
          </div>
        </div>
      </section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-display text-xl font-semibold">Recent</h2>
        <Button as-child variant="link"><RouterLink to="/notes">All notes <ArrowRight aria-hidden="true" /></RouterLink></Button>
      </div>
      <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <li v-for="n in data.slice(0, 5)" :key="n.id">
          <ListRow :as="RouterLink" :to="`/notes/${n.id}`" :title="noteTitle(n)">
            <template #trailing>{{ timeAgo(n.createdAt) }}</template>
          </ListRow>
        </li>
      </ul>
    </template>
  </QueryBoundary>
</template>
