import { readStored, useStoredState } from '@/shared/lib/storage'

const KEY = 'onboarded'

/** Read outside React (router guards). Per-browser; move it to the user record when the contract has a field for it. */
export const isOnboarded = () => readStored<boolean>(KEY, false)

export const useOnboarded = () => useStoredState<boolean>(KEY, false)
