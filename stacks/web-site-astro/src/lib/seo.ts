import { siteConfig } from './site'

export interface PageMeta {
  title: string
  description: string
  /** Path starting with "/". */
  path: string
  type?: 'website' | 'article'
  /** Absolute or site-relative path of the social image. Defaults to /og/site.png. */
  image?: string
  noindex?: boolean
}

/** Absolute URL for a path, using Astro's configured `site`. */
export function absoluteUrl(path: string, site: URL | string): string {
  return new URL(path, site).toString()
}

export function fullTitle(title: string, home = false): string {
  return home ? `${siteConfig.name}: ${siteConfig.tagline}` : `${title} | ${siteConfig.name}`
}

/** schema.org graph present on every page. */
export function siteGraph(site: URL | string) {
  const url = absoluteUrl('/', site)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${url}#org`, name: siteConfig.name, url },
      { '@type': 'WebSite', '@id': `${url}#site`, name: siteConfig.name, url, description: siteConfig.description, publisher: { '@id': `${url}#org` } },
    ],
  }
}

/** Serialise JSON-LD for a script tag; "<" is escaped so a stray "</script>" in a string cannot close it. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
