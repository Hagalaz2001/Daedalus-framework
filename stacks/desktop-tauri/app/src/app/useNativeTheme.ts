import { useTheme } from '@app/ui'
import { useEffect } from 'react'
import { inTauri, native } from '@/shared/lib/native'
import { cssColorToHex } from '@/shared/lib/theme-color'

/**
 * Keeps the native window in step with the page theme: title bar light/dark and the window background colour,
 * so a dark app never flashes white while the webview repaints. The Rust side also saves it for the next launch.
 */
export function useNativeTheme() {
  const { choice, resolved } = useTheme()
  useEffect(() => {
    if (!inTauri()) return
    const surface = cssColorToHex(getComputedStyle(document.body).backgroundColor)
    void native.themeApply(choice, surface).catch(() => undefined)
  }, [choice, resolved])
}
