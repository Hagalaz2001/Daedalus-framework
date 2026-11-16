import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/features/blog'
import { absoluteUrl } from '@/shared/lib/seo'

const pages = ['/', '/pricing', '/about', '/blog', '/contact', '/privacy', '/terms']

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: 'monthly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...getAllPosts().map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.date, changeFrequency: 'yearly' as const, priority: 0.6 })),
  ]
}
