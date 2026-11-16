import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.mock('./native', () => ({
  inTauri: () => true,
  native: {
    tokenGet: vi.fn(async () => store.get('t') ?? null),
    tokenSet: vi.fn(async (t: string) => void store.set('t', t)),
    tokenClear: vi.fn(async () => void store.delete('t')),
  },
}))

import { token } from './token'

describe('token', () => {
  beforeEach(() => store.clear())

  it('persists through the native store and restores it', async () => {
    await token.set('abc')
    expect(token.get()).toBe('abc')
    expect(store.get('t')).toBe('abc')
    await token.clear()
    expect(token.get()).toBeNull()
    expect(await token.restore()).toBeNull()
    store.set('t', 'saved')
    expect(await token.restore()).toBe('saved')
    expect(token.get()).toBe('saved')
  })
})
