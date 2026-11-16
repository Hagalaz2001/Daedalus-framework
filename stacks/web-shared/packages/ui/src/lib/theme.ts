'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Paint the class on <html>. `system` removes both classes and lets the tokens' media query decide. */
export function applyTheme(choice: ThemeChoice) {
  const el = document.documentElement
  el.classList.toggle('dark', choice === 'dark')
  el.classList.toggle('light', choice === 'light')
}

export function useTheme() {
  const choice = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => void listeners.delete(cb)
    },
    read,
    () => 'system' as ThemeChoice,
  )
  const dark = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    systemDark,
    () => false,
  )
  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      /* storage blocked: the choice applies for this page view only */
    }
    applyTheme(next)
    listeners.forEach((l) => l())
  }, [])
  useEffect(() => applyTheme(choice), [choice])
  const resolved: 'light' | 'dark' = choice === 'system' ? (dark ? 'dark' : 'light') : choice
  return { choice, resolved, setTheme }
}
