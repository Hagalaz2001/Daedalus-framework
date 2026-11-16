<script setup lang="ts">
import { Badge, buttonVariants, cn, SegmentedControl } from '@app/ui-vue'
import { Check } from '@lucide/vue'
import { ref } from 'vue'
import { plans } from '../../lib/content'

const billing = ref<'monthly' | 'yearly'>('yearly')
const options = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]
const price = (p: (typeof plans)[number]) => (billing.value === 'yearly' ? p.yearly : p.monthly)
</script>

<template>
  <div>
    <div class="flex items-center gap-3">
      <SegmentedControl v-model="billing" label="Billing period" :options="options" />
      <Badge tone="success">Save 20%</Badge>
    </div>
    <div class="mt-10 grid items-start gap-6 grid-cols-1 lg:grid-cols-3">
      <section
        v-for="p in plans"
        :key="p.id"
        :aria-labelledby="`plan-${p.id}`"
        :class="cn('rounded-lg border p-8', p.featured ? 'border-primary bg-surface ring-1 ring-primary lg:-mt-4 lg:pb-12' : 'border-border bg-surface')"
      >
        <div class="flex items-center justify-between">
          <h2 :id="`plan-${p.id}`" class="font-display text-2xl font-semibold">{{ p.name }}</h2>
          <Badge v-if="p.featured" tone="primary">Most chosen</Badge>
        </div>
        <p class="mt-1 text-text-muted">{{ p.blurb }}</p>
        <p class="mt-6 flex items-baseline gap-1.5">
          <span class="font-display text-5xl font-semibold tabular-nums">${{ price(p) }}</span>
          <span class="text-text-muted">{{ price(p) === 0 ? 'forever' : `per month${billing === 'yearly' ? ', billed yearly' : ''}` }}</span>
        </p>
        <a :href="p.id === 'team' ? '/contact' : '/pricing#start'" :class="cn(buttonVariants({ size: 'lg', variant: p.featured ? 'primary' : 'secondary' }), 'mt-6 w-full')">{{ p.cta }}</a>
        <ul class="mt-8 space-y-3">
          <li v-for="f in p.features" :key="f" class="flex gap-3">
            <Check class="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            {{ f }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
