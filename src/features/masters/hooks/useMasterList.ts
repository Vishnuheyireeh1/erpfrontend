import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { mastersApi } from '../api/masters.api'
import type { ListParams, MasterKey, MasterRow } from '../types'

type Result = { requestKey: string; items: MasterRow[]; total: number; error: string }

const EMPTY: Result = { requestKey: '', items: [], total: 0, error: '' }

// Loads one page of a master list; re-fetches when the key or filters change.
// "loading" = the latest result doesn't belong to the current request yet.
export function useMasterList(key: MasterKey, params: ListParams) {
  const [result, setResult] = useState<Result>(EMPTY)
  const [reloadTick, setReloadTick] = useState(0)
  const { search, page, pageSize, status, parentId } = params
  const requestKey = JSON.stringify([key, search, page, pageSize, status, parentId, reloadTick])

  useEffect(() => {
    let cancelled = false
    mastersApi
      .list(key, { search, page, pageSize, status, parentId })
      .then((res) => {
        if (!cancelled) setResult({ requestKey, items: res.items, total: res.total, error: '' })
      })
      .catch((err) => {
        if (cancelled) return
        const error = err instanceof ApiError ? err.message : 'Could not load the list'
        setResult({ requestKey, items: [], total: 0, error })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, key, search, page, pageSize, status, parentId])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])
  const loading = result.requestKey !== requestKey

  return { items: result.items, total: result.total, error: loading ? '' : result.error, loading, reload }
}
