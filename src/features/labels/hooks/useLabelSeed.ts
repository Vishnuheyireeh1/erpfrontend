import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inventoryApi } from '@/features/inventory/api/inventory.api'
import type { StockItem } from '@/features/inventory/types'
import { productionApi } from '@/features/production/api/production.api'
import { purchaseApi } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'

export type QueueEntry = { item: StockItem; qty: number }

// Labels for stock on hand: whole units only (fabric in metres → 1 label).
const labelsFor = (item: StockItem) => {
  const q = Number(item.stockQty)
  return item.product.unit.allowDecimal || q < 1 ? 1 : Math.floor(q)
}

async function itemsByIds(ids: number[]) {
  const out: StockItem[] = []
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const res = await inventoryApi.list({ ids: chunk.join(','), status: 'all', page: 1, pageSize: 500 })
    out.push(...res.items)
  }
  return out
}

// Pre-fills the label queue from the URL:
//   ?doc=12      → items added by that opening-stock / adjustment document, qty = qty added
//   ?purchase=5  → items on that purchase bill, qty = qty bought
//   ?production=4 → finished pieces of that production entry, qty = pieces made
//   ?product=3   → every size / colour of the product, qty = stock on hand
//   ?variant=11  → one item, qty = stock on hand
async function load(params: URLSearchParams): Promise<QueueEntry[]> {
  const doc = Number(params.get('doc'))
  if (doc) {
    const d = await inventoryApi.document(doc)
    const added = (d.lines ?? []).filter((l) => Number(l.qty) > 0)
    const qty = new Map(added.map((l) => [l.variant.id, Math.max(1, Math.floor(Number(l.qty)))]))
    const items = await itemsByIds([...qty.keys()])
    return items.map((item) => ({ item, qty: item.product.unit.allowDecimal ? 1 : qty.get(item.id) ?? 1 }))
  }
  const purchase = Number(params.get('purchase'))
  if (purchase) {
    const bill = await purchaseApi.get(purchase)
    const qty = new Map<number, number>()
    for (const l of bill.lines) qty.set(l.variant.id, (qty.get(l.variant.id) ?? 0) + Math.max(1, Math.floor(Number(l.qty))))
    const items = await itemsByIds([...qty.keys()])
    return items.map((item) => ({ item, qty: item.product.unit.allowDecimal ? 1 : qty.get(item.id) ?? 1 }))
  }
  const production = Number(params.get('production'))
  if (production) {
    const p = await productionApi.get(production)
    const qty = new Map(p.outputs.map((o) => [o.variantId, Math.max(1, Math.floor(Number(o.qty)))]))
    const items = await itemsByIds([...qty.keys()])
    return items.map((item) => ({ item, qty: item.product.unit.allowDecimal ? 1 : qty.get(item.id) ?? 1 }))
  }
  const product = Number(params.get('product'))
  if (product) {
    const res = await inventoryApi.list({ productId: product, status: 'all', page: 1, pageSize: 500 })
    return res.items.map((item) => ({ item, qty: labelsFor(item) }))
  }
  const variant = Number(params.get('variant'))
  if (variant) {
    const items = await itemsByIds([variant])
    return items.map((item) => ({ item, qty: labelsFor(item) }))
  }
  return []
}

// Result is tagged with the query it belongs to → a new link never shows the previous link's items.
export function useLabelSeed() {
  const [params] = useSearchParams()
  const key = params.toString()
  const [state, setState] = useState<{ key: string | null; entries: QueueEntry[]; error: string }>({ key: null, entries: [], error: '' })

  useEffect(() => {
    let cancelled = false
    load(new URLSearchParams(key))
      .then((entries) => !cancelled && setState({ key, entries, error: '' }))
      .catch((err) => !cancelled && setState({ key, entries: [], error: err instanceof ApiError ? err.message : 'Could not load items' }))
    return () => {
      cancelled = true
    }
  }, [key])

  const loading = state.key !== key
  return { entries: loading ? [] : state.entries, error: loading ? '' : state.error, loading }
}
