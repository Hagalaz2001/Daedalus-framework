import { Faq, faqs, PricingTable } from '@/features/marketing'
import { pageMetadata } from '@/shared/lib/seo'
import { Container } from '@/shared/ui/Container'
import { JsonLd } from '@/shared/ui/JsonLd'

export const metadata = pageMetadata({ title: 'Pricing', description: 'Free for personal use. Pro and Team when you need history, sharing and support.', path: '/pricing' })

export default function PricingPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <h1 className="max-w-2xl font-display text-5xl font-semibold tracking-tight sm:text-6xl">Pay when it earns its place.</h1>
      <p className="mt-5 max-w-xl text-xl text-text-muted">Start free and stay free for as long as a personal notebook is all you need.</p>
      <div id="start" className="mt-14 scroll-mt-24">
        <PricingTable />
      </div>
      <section className="mt-28 grid gap-10 grid-cols-1 lg:grid-cols-[1fr_2fr]" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl font-semibold tracking-tight">
          Questions, answered
        </h2>
        <Faq />
      </section>
    </Container>
  )
}
