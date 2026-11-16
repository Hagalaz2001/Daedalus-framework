import { Badge, Button } from '@app/ui'
import { ArrowRight, Search } from 'lucide-react'
import Link from 'next/link'
import { Container } from '@/shared/ui/Container'

const rows = [
  ['Plan the launch checklist', 'Pricing page copy, release notes, email to the waitlist', '2m'],
  ['Onboarding: three steps, always skippable', 'Cut the survey. Ask for the name only.', '1h'],
  ['Call the accountant about Q4', 'Bring the receipts folder', 'Mon'],
  ['Oat milk', '', 'Sun'],
]

/** The product, drawn with the same kit the app uses, so the page shows what you get. */
function ProductPreview() {
  return (
    <div aria-hidden className="relative">
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-scrim/25">
        <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="p-5">
          <div className="flex h-11 items-center gap-2.5 rounded-md border border-primary px-3.5 text-text-muted">
            <Search className="size-4" />
            <span className="text-text">launch</span>
            <span className="h-5 w-px animate-pulse bg-primary motion-reduce:animate-none" />
          </div>
          <ul className="mt-4 divide-y divide-border">
            {rows.map(([t, s, when], i) => (
              <li key={t} className={`flex items-center justify-between gap-4 py-3 ${i === 0 ? '' : 'opacity-60'}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{i === 0 ? <><mark className="rounded-sm bg-primary/20 px-0.5 text-text">Plan the launch</mark> checklist</> : t}</p>
                  {s && <p className="truncate text-sm text-text-muted">{s}</p>}
                </div>
                <span className="shrink-0 text-sm text-text-muted">{when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Badge tone="success" className="absolute -bottom-3 left-6 bg-surface ring-1 ring-border">
        Saved just now
      </Badge>
    </div>
  )
}

export function Hero() {
  return (
    <section className="pt-16 pb-12 sm:pt-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
            Write it down.
            <br />
            Find it later.
          </h1>
          <p className="mt-6 max-w-lg text-xl text-text-muted">A quiet notebook with fast search. No folders to maintain, no editor to learn, nothing between you and the next thought.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/pricing">
                Start free <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/blog">Read the journal</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-text-muted">Free for personal use. No card needed.</p>
        </div>
        <ProductPreview />
      </Container>
    </section>
  )
}
