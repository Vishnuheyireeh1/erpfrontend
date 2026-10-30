import { useEffect, useState } from 'react'
import { productsApi } from '../api/products.api'
import type { Option } from '../types'

export type ProductOptions = {
  productTypes: Option[]
  categories: Option[]
  units: Option[]
  taxRates: Option[]
  sizes: Option[]
  colours: Option[]
}

const EMPTY: ProductOptions = { productTypes: [], categories: [], units: [], taxRates: [], sizes: [], colours: [] }

// Loads every dropdown the product screens need, in parallel, once.
export function useProductOptions() {
  const [options, setOptions] = useState<ProductOptions>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const keys = Object.keys(EMPTY) as (keyof ProductOptions)[]
    Promise.all(keys.map((k) => productsApi.options(k).catch(() => [] as Option[]))).then((lists) => {
      if (cancelled) return
      setOptions(Object.fromEntries(keys.map((k, i) => [k, lists[i]])) as ProductOptions)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // A row added from a form (e.g. + New type) — shown in the dropdown straight away.
  const addOption = (key: keyof ProductOptions, opt: Option) => setOptions((o) => ({ ...o, [key]: [...o[key], opt] }))

  return { options, ready, addOption }
}

// "Kurtis › Party wear kurtis" — sorted so subcategories follow their main category.
export function categoryOptions(categories: Option[]) {
  return categories
    .map((c) => ({ value: String(c.id), label: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
