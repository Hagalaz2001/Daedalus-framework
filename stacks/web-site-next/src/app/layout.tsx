import { themeInitScript, Toaster } from '@app/ui'
import type { Metadata, Viewport } from 'next'
import { siteConfig } from '@/shared/lib/site'
import { JsonLd } from '@/shared/ui/JsonLd'
import { SiteFooter } from '@/shared/ui/SiteFooter'
import { SiteHeader } from '@/shared/ui/SiteHeader'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name}: ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  openGraph: { siteName: siteConfig.name, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { colorScheme: 'light dark', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              { '@type': 'Organization', '@id': `${siteConfig.url}/#org`, name: siteConfig.name, url: siteConfig.url },
              { '@type': 'WebSite', '@id': `${siteConfig.url}/#site`, name: siteConfig.name, url: siteConfig.url, description: siteConfig.description, publisher: { '@id': `${siteConfig.url}/#org` } },
            ],
          }}
        />
      </head>
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  )
}
