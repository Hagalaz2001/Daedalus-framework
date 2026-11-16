import { Button } from '@app/ui'
import Link from 'next/link'
import { Container } from '@/shared/ui/Container'

export function CtaBand() {
  return (
    <section className="py-12">
      <Container>
        <div className="rounded-lg bg-primary px-8 py-16 text-on-primary sm:px-16">
          <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your next thought deserves a place to land.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-on-primary text-primary hover:bg-on-primary/90">
              <Link href="/pricing">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-on-primary hover:bg-on-primary/15">
              <Link href="/contact">Ask us anything</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
