import { Badge, buttonVariants, cn, SegmentedControl } from '@app/ui'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { plans } from '../../lib/content'

export default function PricingTable() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  return (
    <div>
      <div className="flex items-center gap-3">
        <SegmentedControl
          label="Billing period"
          value={billing}
          onValueChange={(v) => setBilling(v as typeof billing)}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />
        <Badge tone="success">Save 20%</Badge>
      </div>
      <div className="mt-10 grid items-start gap-6 grid-cols-1 lg:grid-cols-3">
        {plans.map((p) => {
          const price = billing === 'yearly' ? p.yearly : p.monthly
          return (
            <section
              key={p.id}
              aria-labelledby={`plan-${p.id}`}
              className={cn('rounded-lg border p-8', p.featured ? 'border-primary bg-surface ring-1 ring-primary lg:-mt-4 lg:pb-12' : 'border-border bg-surface')}
            >
              <div className="flex items-center justify-between">
                <h2 id={`plan-${p.id}`} className="font-display text-2xl font-semibold">
                  {p.name}
                </h2>
                {p.featured && <Badge tone="primary">Most chosen</Badge>}
              </div>
              <p className="mt-1 text-text-muted">{p.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tabular-nums">${price}</span>
                <span className="text-text-muted">{price === 0 ? 'forever' : `per month${billing === 'yearly' ? ', billed yearly' : ''}`}</span>
              </p>
              <a href={p.id === 'team' ? '/contact' : '/pricing#start'} className={cn(buttonVariants({ size: 'lg', variant: p.featured ? 'primary' : 'secondary' }), 'mt-6 w-full')}>
                {p.cta}
              </a>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
