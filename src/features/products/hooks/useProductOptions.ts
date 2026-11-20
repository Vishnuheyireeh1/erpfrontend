import { useEffect, useState } from 'react'
import { supplierApi } from '@/features/purchase/api/purchase.api'
import { productsApi } from '../api/products.api'
import { productTypeMeta } from '../constants'
import type { Option, ProductType } from '../types'

export type ProductOptions = {
  productTypes: Option[]
  categories: Option[]
  units: Option[]
  taxRates: Option[]
  sizes: Option[]
  colours: Option[]
  suppliers: Option[] // active suppliers (Purchase → Suppliers)
}

const EMPTY: ProductOptions = { productTypes: [], categories: [], units: [], taxRates: [], sizes: [], colours: [], suppliers: [] }

// Loads every dropdown the product screens need, in parallel, once.
export function useProductOptions() {
  const [options, setOptions] = useState<ProductOptions>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const keys = (Object.keys(EMPTY) as (keyof ProductOptions)[]).filter((k) => k !== 'suppliers')
    const suppliers = supplierApi.list({ status: 'active', pageSize: 100 }).then((r) => r.items.map((s) => ({ id: s.id, name: s.name }))).catch(() => [] as Option[])
    Promise.all([...keys.map((k) => productsApi.options(k).catch(() => [] as Option[])), suppliers]).then((lists) => {
      if (cancelled) return
      setOptions({ ...(Object.fromEntries(keys.map((k, i) => [k, lists[i]])) as Omit<ProductOptions, 'suppliers'>), suppliers: lists[keys.length] })
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

// Only the 5 main product types (one per kind): the row named like the kind (Ready-made …), else the first of that kind.
// keep = a type that must stay visible (the one an older product already has).
export function mainTypes(types: Option[], keep?: string) {
  const order: ProductType[] = ['READY_MADE', 'FINISHED', 'RAW_MATERIAL', 'ACCESSORY', 'SERVICE']
  const main = order.map((k) => types.find((t) => t.kind === k && t.name.toLowerCase() === productTypeMeta[k].label.toLowerCase()) ?? types.find((t) => t.kind === k)).filter((t): t is Option => !!t)
  const extra = keep ? types.filter((t) => String(t.id) === keep && !main.includes(t)) : []
  return [...main, ...extra]
}

// "Kurtis › Party wear kurtis" — sorted so subcategories follow their main category.
export function categoryOptions(categories: Option[]) {
  return categories
    .map((c) => ({ value: String(c.id), label: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
