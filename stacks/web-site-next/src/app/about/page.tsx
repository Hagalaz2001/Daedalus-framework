import { pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: 'About', description: `Why ${siteConfig.name} exists and how we work.`, path: '/about' })

const principles = [
  ['Calm by default', 'No badges, no streaks, no nudges. The app speaks when you do.'],
  ['Plain text underneath', 'Your notes are Markdown. If we disappeared tomorrow, you would lose nothing.'],
  ['Small on purpose', 'A short list of things done well beats a long list of things done halfway.'],
]

export default function AboutPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <h1 className="max-w-3xl font-display text-5xl leading-tight font-semibold tracking-tight sm:text-6xl">We make the notebook we wanted to open every morning.</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <p className="text-xl text-text-muted">Replace this page with your own story: who you are, what problem you saw, and what you believe about the work.</p>
        <div className="prose-site">
          <p>{siteConfig.name} started as a weekend project and stayed small on purpose. Every feature has to answer one question: does it help you get a thought down faster, or find it again sooner?</p>
          <p>We are a handful of people who write, ship and answer support email ourselves.</p>
        </div>
      </div>
      <dl className="mt-24 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
        {principles.map(([t, d]) => (
          <div key={t} className="bg-surface p-8">
            <dt className="font-display text-2xl font-semibold">{t}</dt>
            <dd className="mt-2 text-text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </Container>
  )
}
