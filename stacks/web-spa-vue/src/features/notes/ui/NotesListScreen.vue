<script setup lang="ts">
import { Button, EmptyState, Input, ListRow, PageHeader, SegmentedControl, Skeleton, SkeletonGroup } from '@app/ui-vue'
import { ChevronRight, NotebookPen, Plus, Search, SearchX } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { timeAgo } from '@/shared/lib/format'
import { QueryBoundary } from '@/shared/ui'
import { filterNotes, noteTitle, rangeOptions, type Range } from '../model/note'
import { useNotes } from '../state/useNotes'

const query = useNotes()
const search = ref('')
const range = ref<Range>('all')
const filtering = computed(() => search.value.trim() !== '' || range.value !== 'all')
const filtered = computed(() => (query.data.value ? filterNotes(query.data.value, search.value, range.value) : []))
function clear() {
  search.value = ''
  range.value = 'all'
}
</script>

<template>
  <PageHeader title="Notes" description="Everything you have written, newest first.">
    <template #actions>
      <Button as-child>
        <RouterLink to="/notes/new"><Plus aria-hidden="true" />New note</RouterLink>
      </Button>
    </template>
  </PageHeader>
  <div class="mb-6 flex flex-wrap items-center gap-3">
    <div class="relative min-w-56 flex-1">
      <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <Input v-model="search" type="search" aria-label="Search notes" placeholder="Search notes" class="pl-10" />
    </div>
    <SegmentedControl v-model="range" label="Show notes from" :options="rangeOptions" />
  </div>

  <QueryBoundary :query="query" :is-empty="(d) => d.length === 0">
    <template #loading>
      <SkeletonGroup label="Loading notes" class="divide-y divide-border rounded-lg border border-border">
        <div v-for="i in 4" :key="i" class="flex flex-col gap-2 px-4 py-3.5">
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-24" />
        </div>
      </SkeletonGroup>
    </template>
    <template #empty>
      <EmptyState title="No notes yet" description="Capture the first thing you do not want to forget.">
        <template #icon><NotebookPen /></template>
        <template #action>
          <Button as-child><RouterLink to="/notes/new">Write a note</RouterLink></Button>
        </template>
      </EmptyState>
    </template>
    <EmptyState v-if="filtered.length === 0" title="No matching notes" description="Try a different word, or widen the date filter.">
      <template #icon><SearchX /></template>
      <template v-if="filtering" #action><Button variant="secondary" @click="clear">Clear filters</Button></template>
    </EmptyState>
    <template v-else>
      <p class="mb-2 text-sm text-text-muted" aria-live="polite">{{ filtered.length }} {{ filtered.length === 1 ? 'note' : 'notes' }}</p>
      <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <li v-for="n in filtered" :key="n.id">
          <ListRow :as="RouterLink" :to="`/notes/${n.id}`" :title="noteTitle(n)" :subtitle="timeAgo(n.createdAt)">
            <template #trailing><ChevronRight class="size-4" aria-hidden="true" /></template>
          </ListRow>
        </li>
      </ul>
    </template>
  </QueryBoundary>
</template>
