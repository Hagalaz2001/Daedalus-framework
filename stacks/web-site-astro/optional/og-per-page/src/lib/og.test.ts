import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { ogSvg, wrapTitle } from './og'
import { woffToSfnt } from './woff'

const input = { title: 'Write first, organise never', siteName: 'Acme Notes', background: '#2a4bd7', foreground: '#ffffff', fontFamily: 'Geist' }

describe('og svg', () => {
  it('builds a 1200x630 card with the title, kicker and brand colours', () => {
    const svg = ogSvg({ ...input, kicker: 'Journal' })
    expect(svg).toContain('width="1200" height="630"')
    expect(svg).toContain('fill="#2a4bd7"')
    expect(svg).toContain('Write first,')
    expect(svg).toContain('organise')
    expect(svg).toContain('never')
    expect(svg).toContain('Journal')
  })
  it('escapes markup in titles', () => {
    const svg = ogSvg({ ...input, title: '<script>alert("x")</script> & more' })
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })
  it('wraps long titles and ends in an ellipsis past four lines', () => {
    expect(wrapTitle('short title', 84)).toEqual(['short title'])
    const long = wrapTitle(Array.from({ length: 60 }, () => 'word').join(' '), 64)
    expect(long).toHaveLength(4)
    expect(long[3]!.endsWith('…')).toBe(true)
  })
})

describe('woffToSfnt', () => {
  it('turns a @fontsource WOFF into TrueType bytes', () => {
    const require = createRequire(import.meta.url)
    const dir = require.resolve('@fontsource/geist/package.json').replace(/package\.json$/, '')
    const out = woffToSfnt(readFileSync(`${dir}files/geist-latin-700-normal.woff`))
    const flavor = new DataView(out.buffer).getUint32(0)
    expect([0x00010000, 0x4f54544f]).toContain(flavor) // TrueType or "OTTO"
    expect(out.length).toBeGreaterThan(5000)
    expect(() => woffToSfnt(new Uint8Array(64))).toThrow()
  })
})
