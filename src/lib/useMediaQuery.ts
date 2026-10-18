import { useSyncExternalStore } from 'react'

// True while the CSS media query matches, e.g. useMediaQuery('(min-width: 1024px)') = laptop / desktop (Tailwind lg).
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
