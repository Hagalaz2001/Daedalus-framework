import { defineStore } from 'pinia'
import { readStored, storedRef } from '@/shared/lib/stored'

const KEY = 'onboarded'

/** Read outside components (router guards). Per-browser; move it to the user record when the contract has a field for it. */
export const isOnboarded = () => readStored<boolean>(KEY, false)

export const useOnboarding = defineStore('onboarding', () => {
  const done = storedRef<boolean>(KEY, false)
  return { done }
})
