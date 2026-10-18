import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

type Result<T> = { key: string; data: T | null; error: string }

/**
 * Loads data for `key` (any JSON-serialisable value describing the request).
 * Re-fetches when the key changes; stale responses are ignored.
 * loading = the latest result doesn't belong to the current key yet.
 */
export function useApiQuery<T>(key: unknown, fetcher: () => Promise<T>) {
  const [tick, setTick] = useState(0)
  const requestKey = JSON.stringify([key, tick])
  const [result, setResult] = useState<Result<T>>({ key: '', data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: '' }))
      .catch((err) => {
        if (cancelled) return
        const error = err instanceof ApiError ? err.message : 'Could not load data'
        setResult({ key: requestKey, data: null, error })
      })
    return () => {
      cancelled = true
    }
    // fetcher is re-created every render; requestKey captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const loading = result.key !== requestKey
  return {
    data: loading ? null : result.data,
    lastData: result.data, // previous page while the next one loads (no flicker)
    error: loading ? '' : result.error,
    loading,
    reload,
  }
}
