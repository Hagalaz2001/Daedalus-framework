import { ref, watch, type Ref } from 'vue'

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** A ref persisted to localStorage; survives blocked storage (private mode) by lasting for the page view. */
export function storedRef<T>(key: string, initial: T): Ref<T> {
  const r = ref(readStored(key, initial)) as Ref<T>
  watch(
    r,
    (v) => {
      try {
        localStorage.setItem(key, JSON.stringify(v))
      } catch {
        /* ignore */
      }
    },
    { deep: true },
  )
  return r
}
