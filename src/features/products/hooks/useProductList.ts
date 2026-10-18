import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'
import { productsApi } from '../api/products.api'
import type { ProductListItem, ProductListParams } from '../types'

type Result = { requestKey: string; items: ProductListItem[]; total: number; error: string }

// One page of products for the current filters ("loading" until the matching result arrives).
export function useProductList(params: ProductListParams) {
  const [result, setResult] = useState<Result>({ requestKey: '', items: [], total: 0, error: '' })
  const [tick, setTick] = useState(0)
  const requestKey = JSON.stringify([params, tick])

  useEffect(() => {
    let cancelled = false
    const query = JSON.parse(requestKey)[0] as ProductListParams
    productsApi
      .list(query)
      .then((res) => !cancelled && setResult({ requestKey, items: res.items, total: res.total, error: '' }))
      .catch((err) => {
        if (cancelled) return
        const error = err instanceof ApiError ? err.message : 'Could not load products'
        setResult({ requestKey, items: [], total: 0, error })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const loading = result.requestKey !== requestKey
  return { items: result.items, total: result.total, error: loading ? '' : result.error, loading, reload }
}
