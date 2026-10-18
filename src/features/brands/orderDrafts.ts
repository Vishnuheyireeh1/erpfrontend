import { itemError, newItem, productError, type ItemDraft, type ProductDraft } from '@/features/jobs/jobDrafts'
import type { MaterialInput, OrderInput, PieceInput } from './api/brandOrder.api'
import type { BrandOrder } from './types'

// Brand order form state. A piece = a job garment line (ownFabric = the brand gave the cloth) + who it is for +
// cloth / lining from our stock (new pieces only; later on the order page).

export type PieceDraft = ItemDraft & { endCustomer: string; materials: ProductDraft[]; stage?: string }
export type OrderForm = { theirOrderNo: string; docDate: string; expectedDate: string; labelNote: string; notes: string }

// Wording of stock lines on brand orders.
export const BRAND_LINE_LABELS = { sold: 'Charged to brand', used: 'Used free', usedNote: 'Not billed — its stock cost counts in the order profit.' }

export const newPiece = (): PieceDraft => ({ ...newItem(), endCustomer: '', materials: [] })

const r2 = (n: number) => Math.round(n * 100) / 100
export const pieceAmount = (d: PieceDraft) =>
  r2((Number(d.qty) || 0) * (Number(d.chargeRate) || 0) + d.materials.reduce((s, m) => s + (m.included ? 0 : (Number(m.qty) || 0) * (Number(m.rate) || 0) * (1 - (Number(m.discountPct) || 0) / 100)), 0))

export function pieceError(d: PieceDraft) {
  return itemError(d) ?? d.materials.map(productError).find(Boolean)
}

export const toMaterialInput = (m: ProductDraft): MaterialInput => ({
  variantId: m.item.id, qty: Number(m.qty), rate: m.included ? 0 : Number(m.rate) || 0, discountPct: m.included ? 0 : Number(m.discountPct) || 0, charged: !m.included,
})

export function toOrderInput(f: OrderForm, pieces: PieceDraft[]): OrderInput {
  return {
    theirOrderNo: f.theirOrderNo.trim() || undefined,
    expectedDate: f.expectedDate,
    labelNote: f.labelNote.trim() || undefined,
    notes: f.notes.trim() || undefined,
    items: pieces.map<PieceInput>((d) => ({
      id: d.id,
      garmentTypeId: Number(d.garmentTypeId),
      description: d.description.trim() || undefined,
      endCustomer: d.endCustomer.trim() || undefined,
      qty: Number(d.qty),
      chargeRate: Number(d.chargeRate) || 0,
      brandCloth: d.ownFabric,
      measurements: Object.fromEntries(Object.entries(d.measurements).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)),
      instructions: d.instructions.trim() || undefined,
      tailorId: d.tailorId ? Number(d.tailorId) : null,
      labourRate: Number(d.labourRate) || 0,
      materials: d.id ? [] : d.materials.map(toMaterialInput),
    })),
  }
}

// Saved order → form state (edit screen). Delivered pieces are left out — they can't change.
export function fromOrder(o: BrandOrder) {
  const form: OrderForm = {
    theirOrderNo: o.theirOrderNo ?? '', docDate: o.docDate.slice(0, 10), expectedDate: o.expectedDate.slice(0, 10), labelNote: o.labelNote ?? '', notes: o.notes ?? '',
  }
  const pieces = o.items
    .filter((i) => i.stage !== 'DELIVERED')
    .map<PieceDraft>((i) => ({
      ...newItem(), id: i.id, garmentTypeId: String(i.garmentTypeId), description: i.description, qty: String(i.qty), chargeRate: String(Number(i.chargeRate)),
      tailorId: i.tailorId ? String(i.tailorId) : '', labourRate: String(Number(i.labourRate)), measurements: { ...i.measurements },
      instructions: i.instructions ?? '', ownFabric: i.brandCloth, endCustomer: i.endCustomer ?? '', materials: [], stage: i.stage,
    }))
  return { form, pieces }
}
