import { useCallback, useEffect, useState } from 'react'
import { mastersApi } from '../api/masters.api'
import type { MasterRow } from '../types'

// Active main categories — for the "Main category" dropdown and the filter.
export function useMainCategories(enabled: boolean) {
  const [items, setItems] = useState<MasterRow[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    mastersApi
      .options('categories', 'root')
      .then((rows) => !cancelled && setItems(rows))
      .catch(() => !cancelled && setItems([]))
    return () => {
      cancelled = true
    }
  }, [enabled, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { items, refresh }
}
