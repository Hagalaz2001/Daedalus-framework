import { ContactForm } from '@/features/contact'
import { pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: 'Contact', description: 'Questions, feedback or a partnership idea: write to us.', path: '/contact' })

export default function ContactPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Say hello.</h1>
          <p className="mt-5 max-w-md text-xl text-text-muted">A real person reads every message. We usually answer within two working days.</p>
          <p className="mt-8 text-text-muted">
            Prefer email? <a href={`mailto:${siteConfig.contactEmail}`} className="font-medium text-primary underline underline-offset-4">{siteConfig.contactEmail}</a>
          </p>
        </div>
        <ContactForm />
      </div>
    </Container>
  )
}
