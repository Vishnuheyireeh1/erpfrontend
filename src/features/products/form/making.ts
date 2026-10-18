import { todayISO } from '@/features/inventory/constants'
import { costsError, costsInput, linesError, type CostDraft, type LineDraft } from '@/features/production/productionDrafts'
import type { ProductionInput } from '@/features/production/types'
import type { Product } from '../types'
import type { VariantRow } from './productForm'

// Own-made product → "Made in the shop": pieces made per size / colour, materials used from stock and making
// costs. Saved with the product as one making entry (PRD/…): materials OUT, pieces IN at cost.
// Pieces are keyed by size + colour (not the row key) so they survive the new → saved product switch.

export type MakingState = { docDate: string; pieces: Record<string, string>; materials: LineDraft[]; costs: CostDraft[] }

export const emptyMaking = (): MakingState => ({ docDate: todayISO(), pieces: {}, materials: [], costs: [] })
export const comboKey = (v: { sizeId: number | null; colourId: number | null }) => `${v.sizeId ?? 0}-${v.colourId ?? 0}`

// Rows with pieces typed in (only the sizes / colours still on the product).
const madeRows = (m: MakingState, rows: VariantRow[]) => rows.map((r) => ({ row: r, qty: m.pieces[comboKey(r)] ?? '' })).filter((x) => x.qty.trim() !== '')
export const makingPieces = (m: MakingState, rows: VariantRow[]) => madeRows(m, rows).map((x) => ({ qty: x.qty }))

// Anything filled in? Empty section = the product is just saved.
export const makingUsed = (m: MakingState, rows: VariantRow[]) => madeRows(m, rows).length > 0 || m.materials.length > 0 || m.costs.length > 0

export function makingError(m: MakingState, rows: VariantRow[], wholePieces: boolean): string | null {
  const made = madeRows(m, rows)
  if (!made.length) return 'Made in the shop: enter how many pieces were made'
  const bad = made.find((x) => !(Number(x.qty) > 0))
  if (bad) return 'Made in the shop: pieces must be more than 0'
  if (wholePieces && made.some((x) => !Number.isInteger(Number(x.qty)))) return 'Made in the shop: pieces are counted in whole numbers'
  if (m.docDate > todayISO()) return "Made in the shop: the date can't be in the future"
  const ids = rows.map((r) => r.id).filter(Boolean)
  const self = m.materials.find((l) => ids.includes(l.item.id))
  if (self) return "Made in the shop: the product can't be its own material"
  const lines = linesError(m.materials) ?? costsError(m.costs)
  return lines ? `Made in the shop: ${lines}` : null
}

// After the product is saved: its real variant ids for the pieces made.
export function makingInput(m: MakingState, rows: VariantRow[], saved: Product): ProductionInput {
  const outputs = madeRows(m, rows).map(({ row, qty }) => {
    const v = saved.variants.find((x) => comboKey(x) === comboKey(row))
    if (!v) throw new Error('A size / colour was not saved — open the product and try again')
    return { variantId: v.id, qty: Number(qty) }
  })
  return {
    docDate: m.docDate,
    title: saved.name,
    outputs,
    materials: m.materials.map((l) => ({ variantId: l.item.id, qty: Number(l.qty) })),
    costs: costsInput(m.costs),
  }
}
