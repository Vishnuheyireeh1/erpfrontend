import { useCallback, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'

// "Show 10 / 20 / 50 / 100" on a list: remembered per page, in this browser.
export const PAGE_SIZES = [10, 20, 50, 100]
const KEY = 'sairandhri.pageSizes'

const read = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number> } catch { return {} }
}
let sizes = read()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

export function usePageSize(fallback = 20) {
  const { pathname } = useLocation()
  const size = useSyncExternalStore(subscribe, () => sizes[pathname] ?? fallback)
  const set = useCallback((n: number) => {
    sizes = { ...sizes, [pathname]: n }
    try { localStorage.setItem(KEY, JSON.stringify(sizes)) } catch { /* private mode — keep in memory only */ }
    listeners.forEach((fn) => fn())
  }, [pathname])
  return [size, set] as const
}
