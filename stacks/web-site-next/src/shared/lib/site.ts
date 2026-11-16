import tokens from '../../../../../design/tokens.json'

// The generator replaces {displayName} (here and in README) with the product name.
export const siteConfig = {
  name: '{displayName}',
  tagline: 'Notes that stay out of your way',
  description: 'A calm place to write things down and find them again. Fast search, no clutter, yours to export.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  contactEmail: 'hello@example.com',
  nav: [
    { href: '/pricing', label: 'Pricing' },
    { href: '/blog', label: 'Journal' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173',
} as const

/** Brand colours straight from design/tokens.json (Open Graph images cannot read CSS variables). */
export const brand = tokens.color
