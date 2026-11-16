import { inTauri, native } from './native'

let cached: string | null = null

/**
 * The bearer token: in memory for requests, persisted by the Rust side in the OS credential store
 * (Windows Credential Manager, macOS Keychain, Secret Service). Never localStorage.
 * In a plain browser (no Tauri) it lives in memory only, which is enough for UI work.
 */
export const token = {
  get: () => cached,
  async restore() {
    cached = inTauri() ? await native.tokenGet().catch(() => null) : null
    return cached
  },
  async set(value: string) {
    cached = value
    if (inTauri()) await native.tokenSet(value)
  },
  async clear() {
    cached = null
    if (inTauri()) await native.tokenClear().catch(() => undefined)
  },
}
