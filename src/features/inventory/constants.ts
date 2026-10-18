import type { Tone } from '@/components/ui/Badge'
import type { AdjustmentReason, MovementType, StockItem } from './types'

export const movementLabels: Record<MovementType, string> = {
  OPENING: 'Opening stock',
  ADJUSTMENT_IN: 'Adjustment +',
  ADJUSTMENT_OUT: 'Adjustment −',
  PURCHASE: 'Purchase',
  PURCHASE_RETURN: 'Purchase return',
  SALE: 'Sale',
  SALE_RETURN: 'Sale return',
  JOB_CONSUMPTION: 'Used in job',
  PRODUCTION_IN: 'Produced',
  PRODUCTION_OUT: 'Used in production',
  CANCELLATION: 'Cancelled',
}

export const reasonLabels: Record<AdjustmentReason, string> = {
  OPENING: 'Opening stock',
  DAMAGED: 'Damaged',
  LOST: 'Lost / theft',
  FOUND: 'Found extra',
  COUNT_CORRECTION: 'Count correction',
  SAMPLE: 'Sample / gift',
  OTHER: 'Other',
}

// Reasons offered on the adjustment form (opening has its own screen).
export const adjustmentReasonOptions = (Object.keys(reasonLabels) as AdjustmentReason[])
  .filter((r) => r !== 'OPENING')
  .map((value) => ({ value, label: reasonLabels[value] }))

export function stockState(item: Pick<StockItem, 'stockQty' | 'minStock'>): { label: string; tone: Tone } {
  const qty = Number(item.stockQty)
  if (qty <= 0) return { label: 'Out of stock', tone: 'danger' }
  if (qty <= Number(item.minStock)) return { label: 'Low stock', tone: 'warn' }
  return { label: 'In stock', tone: 'success' }
}

// "Anarkali kurti · M · Red"
export function itemTitle(item: { size: { name: string } | null; colour: { name: string } | null; product: { name: string } }) {
  return [item.product.name, item.size?.name, item.colour?.name].filter(Boolean).join(' · ')
}

// 12 → "12", 23.25 → "23.25" (no trailing zeros), with unit code.
export function qtyText(qty: string | number, unit?: string) {
  const n = Number(qty)
  const text = n.toLocaleString('en-IN', { maximumFractionDigits: 3 })
  return unit ? `${text} ${unit}` : text
}

// Today in India as YYYY-MM-DD (not UTC — 00:00–05:30 IST would otherwise be "yesterday").
export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
