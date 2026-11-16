import { invoke } from '@tauri-apps/api/core'

/** True inside the Tauri webview. In a plain browser (the dev server opened in Chrome) the native layer is absent. */
export const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** The Rust commands the frontend calls. They are registered in src-tauri/src/lib.rs. */
export const native = {
  tokenGet: () => invoke<string | null>('token_get'),
  tokenSet: (token: string) => invoke<void>('token_set', { token }),
  tokenClear: () => invoke<void>('token_clear'),
  /** Tells the shell which theme is active so the title bar and the window background match. */
  themeApply: (choice: string, surface?: string) => invoke<void>('theme_apply', { choice, surface }),
  /** Shows the window after the first paint (it starts hidden so there is no white flash). */
  appReady: () => invoke<void>('app_ready'),
}
