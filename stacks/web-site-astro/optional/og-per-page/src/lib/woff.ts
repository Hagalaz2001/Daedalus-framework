import { inflateSync } from 'node:zlib'

/**
 * Converts a WOFF (version 1) font to plain TrueType/OpenType bytes. resvg renders text only from TTF/OTF, while
 * @fontsource ships WOFF/WOFF2; WOFF1 is just zlib-compressed tables, so no font library is needed.
 */
export function woffToSfnt(woff: Uint8Array): Uint8Array {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength)
  if (v.getUint32(0) !== 0x774f4646) throw new Error('Not a WOFF 1 file (@fontsource "files/*.woff")')
  const flavor = v.getUint32(4)
  const count = v.getUint16(12)

  const tables = Array.from({ length: count }, (_, i) => {
    const e = 44 + i * 20
    const offset = v.getUint32(e + 4)
    const compLength = v.getUint32(e + 8)
    const origLength = v.getUint32(e + 12)
    const raw = woff.subarray(offset, offset + compLength)
    return {
      tag: v.getUint32(e),
      checksum: v.getUint32(e + 16),
      data: compLength < origLength ? new Uint8Array(inflateSync(raw)) : raw,
    }
  })

  const pad = (n: number) => (n + 3) & ~3
  const headerSize = 12 + count * 16
  const total = tables.reduce((n, t) => n + pad(t.data.length), headerSize)
  const out = new Uint8Array(total)
  const o = new DataView(out.buffer)

  let entrySelector = 0
  while (1 << (entrySelector + 1) <= count) entrySelector++
  const searchRange = (1 << entrySelector) * 16
  o.setUint32(0, flavor)
  o.setUint16(4, count)
  o.setUint16(6, searchRange)
  o.setUint16(8, entrySelector)
  o.setUint16(10, count * 16 - searchRange)

  let offset = headerSize
  tables.forEach((t, i) => {
    const r = 12 + i * 16
    o.setUint32(r, t.tag)
    o.setUint32(r + 4, t.checksum)
    o.setUint32(r + 8, offset)
    o.setUint32(r + 12, t.data.length)
    out.set(t.data, offset)
    offset += pad(t.data.length)
  })
  return out
}
