import { pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: 'Privacy policy', description: `How ${siteConfig.name} handles your data.`, path: '/privacy' })

export default function PrivacyPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-3 text-text-muted">Template text. Have a lawyer review it before you publish.</p>
      <div className="prose-site mt-10">
        <h2>What we collect</h2>
        <p>Account details you give us (name, email) and the notes you write. We also keep basic server logs for security and debugging.</p>
        <h2>How we use it</h2>
        <p>To run the service, keep it secure and answer your messages. We do not sell personal data and do not use notes to train models.</p>
        <h2>Your choices</h2>
        <p>You can export or delete your data at any time from your profile. Deleting your account removes your notes.</p>
        <h2>Contact</h2>
        <p>
          Questions: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        </p>
      </div>
    </Container>
  )
}
