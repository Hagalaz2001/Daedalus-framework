import Link from 'next/link'
import { siteConfig } from '../lib/site'
import { getApiStatus } from '../lib/status'
import { Container } from './Container'

const columns = [
  { title: 'Product', links: [{ href: '/pricing', label: 'Pricing' }, { href: '/blog', label: 'Journal' }] },
  { title: 'Company', links: [{ href: '/about', label: 'About' }, { href: '/contact', label: 'Contact' }] },
  { title: 'Legal', links: [{ href: '/privacy', label: 'Privacy' }, { href: '/terms', label: 'Terms' }] },
]

export async function SiteFooter() {
  const status = await getApiStatus()
  return (
    <footer className="mt-32 border-t border-border bg-surface-muted/50">
      <Container className="grid gap-12 py-14 grid-cols-1 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="font-display text-xl font-semibold">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-text-muted">{siteConfig.tagline}.</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-1">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-text-muted hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-sm text-text-muted">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
        {status === 'ok' && (
          <p className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            All systems operational
          </p>
        )}
      </Container>
    </footer>
  )
}
