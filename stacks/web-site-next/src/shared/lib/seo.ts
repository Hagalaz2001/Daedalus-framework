import type { Metadata } from 'next'
import { siteConfig } from './site'

/** Per-page metadata: title, canonical URL, Open Graph and Twitter cards. `path` starts with "/". */
export function pageMetadata({ title, description, path, type = 'website' }: { title: string; description: string; path: string; type?: 'website' | 'article' }): Metadata {
  const url = `${siteConfig.url}${path}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url, siteName: siteConfig.name, type, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export const absoluteUrl = (path: string) => `${siteConfig.url}${path}`
