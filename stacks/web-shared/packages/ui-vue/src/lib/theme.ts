import { computed, ref } from 'vue'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'theme'

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const browser = typeof window !== 'undefined'
const choice = ref<ThemeChoice>(browser ? read() : 'system')
const systemDark = ref(browser && window.matchMedia('(prefers-color-scheme: dark)').matches)
if (browser) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => (systemDark.value = e.matches))

/** Paint the class on <html>. `system` removes both classes and lets the tokens' media query decide. */
export function applyTheme(c: ThemeChoice) {
  const el = document.documentElement
  el.classList.toggle('dark', c === 'dark')
  el.classList.toggle('light', c === 'light')
}

export function useTheme() {
  const resolved = computed<'light' | 'dark'>(() => (choice.value === 'system' ? (systemDark.value ? 'dark' : 'light') : choice.value))
  function setTheme(next: ThemeChoice) {
    choice.value = next
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      /* storage blocked: applies for this page view only */
    }
    applyTheme(next)
  }
  return { choice, resolved, setTheme }
}
