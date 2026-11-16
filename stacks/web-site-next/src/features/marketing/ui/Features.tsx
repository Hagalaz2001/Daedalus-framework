import { Keyboard, PackageOpen, Zap } from 'lucide-react'
import { Container } from '@/shared/ui/Container'
import { features } from '../model/content'

export function Features() {
  return (
    <section className="py-24">
      <Container>
        <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">Built for the moment you need the note back.</h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border grid-cols-1 md:grid-cols-3">
          <div className="bg-surface p-8 md:col-span-2 md:p-10">
            <Zap className="size-6 text-primary" aria-hidden />
            <h3 className="mt-5 font-display text-2xl font-semibold">{features.search.title}</h3>
            <p className="mt-2 max-w-md text-text-muted">{features.search.body}</p>
            <p className="mt-8 font-display text-6xl font-semibold tracking-tight">
              Type<span className="text-primary">.</span> See<span className="text-primary">.</span>
            </p>
            <p className="text-sm text-text-muted">Results update on every keystroke.</p>
          </div>
          <div className="bg-surface p-8 md:p-10">
            <Keyboard className="size-6 text-primary" aria-hidden />
            <h3 className="mt-5 font-display text-2xl font-semibold">{features.capture.title}</h3>
            <p className="mt-2 text-text-muted">{features.capture.body}</p>
          </div>
          <div className="bg-surface p-8 md:col-span-3 md:flex md:items-center md:justify-between md:gap-12 md:p-10">
            <div className="max-w-xl">
              <PackageOpen className="size-6 text-primary" aria-hidden />
              <h3 className="mt-5 font-display text-2xl font-semibold">{features.own.title}</h3>
              <p className="mt-2 text-text-muted">{features.own.body}</p>
            </div>
            <pre className="mt-6 overflow-x-auto rounded-md border border-border bg-surface-muted px-5 py-4 font-mono text-sm md:mt-0">
{`notes/
  2026-11-14-launch-checklist.md
  2026-11-16-onboarding.md
  oat-milk.md`}
            </pre>
          </div>
        </div>
      </Container>
    </section>
  )
}
