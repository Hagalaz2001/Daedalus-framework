export interface OgInput {
  title: string
  kicker?: string
  siteName: string
  /** Colours from design/tokens.json. */
  background: string
  foreground: string
  fontFamily: string
}

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
const PAD = 72

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)

/** Greedy word wrap by estimated glyph width (0.5 em on average for bold sans); at most `maxLines`, ending in an ellipsis. */
export function wrapTitle(text: string, fontSize: number, maxLines = 4, width = OG_WIDTH - PAD * 2): string[] {
  const perLine = Math.max(8, Math.floor(width / (fontSize * 0.5)))
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > perLine) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = kept[maxLines - 1]!.replace(/[\s.,;:!?-]*$/, '') + '…'
  return kept
}

/** The social card as an SVG string: brand colour field, site name top left, title anchored bottom left. */
export function ogSvg(i: OgInput): string {
  const size = i.title.length > 60 ? 64 : 84
  const lh = size * 1.05
  const lines = wrapTitle(i.title, size)
  const lastBaseline = OG_HEIGHT - PAD - size * 0.2
  const firstBaseline = lastBaseline - (lines.length - 1) * lh
  const tspans = lines.map((l, n) => `<tspan x="${PAD}" y="${(firstBaseline + n * lh).toFixed(1)}">${escapeXml(l)}</tspan>`).join('')
  const kicker = i.kicker
    ? `<text x="${PAD}" y="${(firstBaseline - lh - 8).toFixed(1)}" font-size="30" opacity="0.8">${escapeXml(i.kicker)}</text>`
    : ''
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">`,
    `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${escapeXml(i.background)}"/>`,
    `<g font-family="${escapeXml(i.fontFamily)}" font-weight="700" fill="${escapeXml(i.foreground)}">`,
    `<text x="${PAD}" y="${PAD + 28}" font-size="34">${escapeXml(i.siteName)}</text>`,
    kicker,
    `<text font-size="${size}" letter-spacing="-2">${tspans}</text>`,
    `</g></svg>`,
  ].join('')
}
