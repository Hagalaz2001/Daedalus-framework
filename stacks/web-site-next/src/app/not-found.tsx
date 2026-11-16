import { Button } from '@app/ui'
import Link from 'next/link'
import { Container } from '@/shared/ui/Container'

export const metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return (
    <Container className="py-32">
      <p className="font-display text-8xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">This page wandered off.</h1>
      <p className="mt-3 max-w-md text-xl text-text-muted">The link may be old, or the address mistyped.</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Back to the homepage</Link>
      </Button>
    </Container>
  )
}
