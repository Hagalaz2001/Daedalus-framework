import { siteConfig } from '@/shared/lib/site'
import { ogImage, ogSize } from '@/shared/ui/og'

export const alt = siteConfig.tagline
export const size = ogSize
export const contentType = 'image/png'

export default function Image() {
  return ogImage({ title: siteConfig.tagline })
}
