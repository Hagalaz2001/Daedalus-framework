import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { inTauri } from '../lib/native'

/**
 * Inside Tauri every request to the backend goes through the Rust HTTP client (tauri-plugin-http), so the webview's
 * CORS rules do not apply and the backend needs no desktop-specific CORS entry. The allowed origins are listed in
 * src-tauri/capabilities/default.json. In a plain browser it falls back to the browser's fetch.
 */
export const httpFetch: typeof fetch = (input, init) => (inTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init))
