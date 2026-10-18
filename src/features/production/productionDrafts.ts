import type { StockItem } from '@/features/inventory/types'
import type { CostKind, PaymentMode, ProductionInput } from './types'

// Making an own-made product (Products → own-made → "Made in the shop"): materials used, making costs,
// and the same cost maths as the server (preview only — the server decides).

export type LineDraft = { key: string; item: StockItem; qty: string }
export type CostDraft = { key: string; kind: CostKind; description: string; tailorId: string; qty: string; rate: string; amount: string; mode: PaymentMode | ''; reference: string }

let seq = 0
export const newKey = () => `k${++seq}`
export const newLine = (item: StockItem): LineDraft => ({ key: newKey(), item, qty: '1' })
export const newCost = (kind: CostKind, pieces = 0): CostDraft => ({
  key: newKey(), kind, tailorId: '', qty: kind === 'TAILOR' && pieces ? String(pieces) : '', rate: '', amount: '', mode: kind === 'PAID' ? 'CASH' : '', reference: '',
  description: kind === 'TAILOR' ? 'Stitching' : kind === 'PAID' ? '' : 'Cutting',
})

const r2 = (n: number) => Math.round(n * 100) / 100
export const costAmount = (c: CostDraft) => (c.kind === 'TAILOR' ? r2((Number(c.qty) || 0) * (Number(c.rate) || 0)) : r2(Number(c.amount) || 0))

export function calcProduction(outputs: { qty: string }[], materials: LineDraft[], costs: CostDraft[]) {
  const pieces = outputs.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  const material = r2(materials.reduce((s, l) => s + (Number(l.qty) || 0) * Number(l.item.avgCost), 0))
  const sum = (k: CostKind) => r2(costs.filter((c) => c.kind === k).reduce((s, c) => s + costAmount(c), 0))
  const labour = sum('TAILOR'), paid = sum('PAID'), salaried = sum('SALARIED')
  const stockCost = r2(material + labour + paid)
  return { pieces, material, labour, paid, salaried, stockCost, perPiece: pieces ? stockCost / pieces : 0, fullPerPiece: pieces ? (stockCost + salaried) / pieces : 0 }
}

// First problem with the materials, in plain words (or null).
export function linesError(lines: LineDraft[]) {
  const bad = lines.find((l) => !(Number(l.qty) > 0))
  if (bad) return `Enter the quantity for ${bad.item.product.name}`
  const whole = lines.find((l) => !l.item.product.unit.allowDecimal && !Number.isInteger(Number(l.qty)))
  if (whole) return `${whole.item.product.name} is counted in whole numbers`
  return null
}

// First problem with the making costs (or null).
export function costsError(costs: CostDraft[]) {
  for (const c of costs) {
    if (!c.description.trim()) return 'Describe every making cost'
    if (c.kind === 'TAILOR' && !c.tailorId) return `Choose the tailor for "${c.description}"`
    if (costAmount(c) <= 0) return `Enter the amount for "${c.description}"`
    if (c.kind === 'PAID' && !c.mode) return `Choose how "${c.description}" was paid`
  }
  return null
}

export const costsInput = (costs: CostDraft[]): ProductionInput['costs'] =>
  costs.map((c) => ({
    kind: c.kind,
    description: c.description.trim(),
    ...(c.kind === 'TAILOR' ? { tailorId: Number(c.tailorId), qty: Number(c.qty), rate: Number(c.rate) } : { amount: Number(c.amount) }),
    ...(c.kind === 'PAID' ? { mode: c.mode as PaymentMode, reference: c.reference.trim() || undefined } : {}),
  }))
