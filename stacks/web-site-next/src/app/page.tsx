import { CtaBand, Features, Hero } from '@/features/marketing'
import { pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: `${siteConfig.name}: ${siteConfig.tagline}`, description: siteConfig.description, path: '/' })

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Container className="py-8">
        <figure className="max-w-3xl">
          <blockquote className="font-display text-3xl leading-snug font-medium tracking-tight sm:text-4xl">
            “I stopped organising and started finding. That was the whole upgrade.”
          </blockquote>
          <figcaption className="mt-5 text-text-muted">Sample testimonial. Replace it with a real customer quote, or delete this block.</figcaption>
        </figure>
      </Container>
      <CtaBand />
    </>
  )
}
