import { ImageResponse } from 'next/og'
import { brand, siteConfig } from '../lib/site'

export const ogSize = { width: 1200, height: 630 }

/** Social card in the brand colours from design/tokens.json. Next serves it at <route>/opengraph-image. */
export function ogImage({ title, kicker }: { title: string; kicker?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: brand.primary, color: brand.onPrimary }}>
        <div style={{ fontSize: 34, fontWeight: 700, display: 'flex' }}>{siteConfig.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kicker && <div style={{ fontSize: 30, opacity: 0.8, marginBottom: 20, display: 'flex' }}>{kicker}</div>}
          <div style={{ fontSize: title.length > 60 ? 64 : 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, display: 'flex' }}>{title}</div>
        </div>
      </div>
    ),
    ogSize,
  )
}
