import { describe, expect, it } from 'vitest'
import { cssColorToHex } from './theme-color'

describe('cssColorToHex', () => {
  it('converts rgb and rgba', () => {
    expect(cssColorToHex('rgb(14, 17, 22)')).toBe('#0e1116')
    expect(cssColorToHex('rgba(255, 255, 255, 1)')).toBe('#ffffff')
    expect(cssColorToHex('rgb(0 0 0 / 50%)')).toBe('#000000')
  })
  it('rejects what it cannot read or what is transparent', () => {
    expect(cssColorToHex('oklch(0.2 0.01 260)')).toBeUndefined()
    expect(cssColorToHex('rgba(0, 0, 0, 0)')).toBeUndefined()
    expect(cssColorToHex('')).toBeUndefined()
  })
})
