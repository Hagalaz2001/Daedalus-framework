import tokens from '../../../../design/tokens.json'

// The generator replaces {displayName} (here and in README) with the product name.
export const siteConfig = {
  name: '{displayName}',
  tagline: 'Notes that stay out of your way',
  description: 'A calm place to write things down and find them again. Fast search, no clutter, yours to export.',
  contactEmail: 'hello@example.com',
  nav: [
    { href: '/pricing', label: 'Pricing' },
    { href: '/blog', label: 'Journal' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
  /** 'default': one image for every page (public/og-default.png, `deno task og:default`). 'per-page': see `deno task og:per-page` (adds an MPL-2.0 dependency). */
  og: 'default' as 'default' | 'per-page',
  appUrl: import.meta.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
  /** Where the contact form POSTs JSON (a form service, chat webhook or your backend). Empty: the form explains it is not connected. */
  contactEndpoint: (import.meta.env.PUBLIC_CONTACT_ENDPOINT as string | undefined) ?? '',
} as const

/** Brand colours straight from design/tokens.json (Open Graph images cannot read CSS variables). */
export const brand = tokens.color
export const brandFonts = tokens.font
