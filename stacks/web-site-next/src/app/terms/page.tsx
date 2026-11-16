import { pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: 'Terms of service', description: `The rules for using ${siteConfig.name}.`, path: '/terms' })

export default function TermsPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Terms of service</h1>
      <p className="mt-3 text-text-muted">Template text. Have a lawyer review it before you publish.</p>
      <div className="prose-site mt-10">
        <h2>Using the service</h2>
        <p>You are responsible for your account and for what you store in it. Do not use the service to break the law or to harm others.</p>
        <h2>Your content</h2>
        <p>Your notes belong to you. You grant us only the permission needed to store and display them back to you.</p>
        <h2>Payments</h2>
        <p>Paid plans renew until cancelled. You can cancel at any time; the plan runs to the end of the paid period.</p>
        <h2>Changes</h2>
        <p>We will tell you about material changes to these terms before they apply.</p>
      </div>
    </Container>
  )
}
