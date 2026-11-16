<script setup lang="ts">
import { Card, CardContent, PageHeader, SegmentedControl, Switch, Tabs, TabsContent, TabsList, TabsTrigger, useTheme, type ThemeChoice } from '@app/ui-vue'
import { Monitor, Moon, Sun } from '@lucide/vue'
import { storedRef } from '@/shared/lib/stored'

const { choice, setTheme } = useTheme()
// Local preferences. Persist them per user through the API once the contract has a settings resource.
const prefs = storedRef('prefs', { weekly: true, product: false })
const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]
</script>

<template>
  <PageHeader title="Settings" description="How the app looks and what it tells you about." />
  <Tabs default-value="appearance">
    <TabsList aria-label="Settings sections">
      <TabsTrigger value="appearance">Appearance</TabsTrigger>
      <TabsTrigger value="notifications">Notifications</TabsTrigger>
    </TabsList>
    <TabsContent value="appearance">
      <Card>
        <CardContent class="space-y-3">
          <h2 class="font-display text-lg font-semibold">Theme</h2>
          <p class="text-sm text-text-muted">System follows your device and changes with it.</p>
          <SegmentedControl :model-value="choice" label="Theme" :options="themes" @update:model-value="setTheme($event as ThemeChoice)">
            <template #option="{ option }">
              <component :is="themes.find((t) => t.value === option.value)!.icon" class="size-4" aria-hidden="true" />{{ option.label }}
            </template>
          </SegmentedControl>
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="notifications">
      <Card>
        <CardContent class="divide-y divide-border">
          <Switch v-model="prefs.weekly" label="Weekly summary"><template #description>One email on Monday with what you wrote last week.</template></Switch>
          <Switch v-model="prefs.product" label="Product news"><template #description>New features, rarely.</template></Switch>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</template>
