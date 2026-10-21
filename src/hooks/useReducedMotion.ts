import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(listener: () => void) {
  const media = window.matchMedia?.(query)
  media?.addEventListener('change', listener)
  return () => media?.removeEventListener('change', listener)
}
const getSnapshot = () => window.matchMedia?.(query).matches ?? false

/** Respond to preference changes without overwriting the saved animation setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
