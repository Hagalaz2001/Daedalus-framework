import { Resvg } from '@resvg/resvg-js'
import type { APIRoute, GetStaticPaths } from 'astro'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ogSvg } from '../../lib/og'
import { getPosts } from '../../lib/posts'
import { brand, brandFonts, siteConfig } from '../../lib/site'
import { woffToSfnt } from '../../lib/woff'

// Social cards as PNG at build time: /og/site.png and /og/<post>.png. An SVG built from design/tokens.json (colours, display
// font) is rasterised by resvg. No layout engine dependency: the title is wrapped by a simple width estimate.
export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  return [
    { params: { slug: 'site' }, props: { title: siteConfig.tagline, kicker: undefined } },
    ...posts.map((p) => ({ params: { slug: p.id }, props: { title: p.data.title, kicker: 'Journal' } })),
  ]
}

const require = createRequire(import.meta.url)
const slug = (n: string) => n.toLowerCase().replace(/\s+/g, '-')

/** The display font's Latin bold file from @fontsource, converted to TTF in a temp file (resvg loads fonts by path). Falls back to Geist. */
function loadFont(): { family: string; file: string; cleanup: () => void } {
  for (const family of [brandFonts.display ?? brandFonts.sans, 'Geist']) {
    try {
      const dir = require.resolve(`@fontsource/${slug(family)}/package.json`).replace(/package\.json$/, '')
      const ttf = woffToSfnt(readFileSync(`${dir}files/${slug(family)}-latin-700-normal.woff`))
      const tmp = mkdtempSync(join(tmpdir(), 'og-font-'))
      const file = join(tmp, `${slug(family)}.ttf`)
      writeFileSync(file, ttf)
      return { family, file, cleanup: () => rmSync(tmp, { recursive: true, force: true }) }
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No OG font found: add @fontsource/<your display font> to package.json')
}

export const GET: APIRoute<{ title: string; kicker?: string }> = ({ props }) => {
  const font = loadFont()
  try {
    const svg = ogSvg({ title: props.title, kicker: props.kicker, siteName: siteConfig.name, background: brand.primary, foreground: brand.onPrimary, fontFamily: font.family })
    const png = new Resvg(svg, { font: { fontFiles: [font.file], loadSystemFonts: false, defaultFontFamily: font.family } }).render().asPng()
    return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } })
  } finally {
    font.cleanup()
  }
}
