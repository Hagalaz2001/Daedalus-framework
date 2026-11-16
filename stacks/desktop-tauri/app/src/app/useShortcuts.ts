import { useTheme } from '@app/ui'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

/** Desktop keyboard shortcuts (Ctrl on Windows and Linux, Cmd on macOS). */
export function useShortcuts() {
  const navigate = useNavigate()
  const { resolved, setTheme } = useTheme()
  useEffect(() => {
    const routes: Record<string, string> = { '1': '/', '2': '/notes', '3': '/settings', '4': '/profile', n: '/notes/new', ',': '/settings' }
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (e.shiftKey && key === 'l') {
        e.preventDefault()
        setTheme(resolved === 'dark' ? 'light' : 'dark')
      } else if (!e.shiftKey && routes[key]) {
        e.preventDefault()
        void navigate(routes[key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, resolved, setTheme])
}
