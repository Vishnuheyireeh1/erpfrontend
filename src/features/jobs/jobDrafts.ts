import type { TailorOption } from '@/features/workshop/api/workshop.api'
import type { GarmentType } from '@/features/workshop/types'
import type { StockItem } from '@/features/inventory/types'
import type { JobInput, JobProductInput } from './api/jobs.api'
import type { Job } from './types'

// Editable form state of a job (strings while typing) and conversions to / from the API.

export type ItemDraft = {
  key: string
  id?: number
  garmentTypeId: string
  description: string
  qty: string
  chargeRate: string
  tailorId: string
  labourRate: string
  measurements: Record<string, string>
  instructions: string
  ownFabric: boolean
  measuredById?: string // staff who took the measurements ('' = not recorded)
}
// Extra charge on the bill (embroidery ₹500 …). Shop costs are added on the job page.
export type CostDraft = { key: string; kind: string; description: string; charge: string }

let seq = 0
export const newItem = (): ItemDraft => ({ key: `i${++seq}`, garmentTypeId: '', description: '', qty: '1', chargeRate: '', tailorId: '', labourRate: '', measurements: {}, instructions: '', ownFabric: false })
export const newCost = (kind = 'Embroidery'): CostDraft => ({ key: `c${++seq}`, kind, description: '', charge: '' })

// Tailor's own rate for this garment, else the garment's usual labour.
export const labourFor = (tailors: TailorOption[], garments: GarmentType[], tailorId: string, garmentId: string) =>
  tailors.find((t) => String(t.id) === tailorId)?.rates.find((r) => String(r.garmentTypeId) === garmentId)?.rate ??
  garments.find((g) => String(g.id) === garmentId)?.defaultLabour ?? '0'

// Garment chosen → its usual price, the tailor's pay, and the customer's last measurements filled in.
export const garmentPatch = (gid: string, garments: GarmentType[], tailors: TailorOption[], tailorId: string, latest?: Record<string, string>): Partial<ItemDraft> => {
  const g = garments.find((x) => String(x.id) === gid)
  return {
    garmentTypeId: gid,
    description: g?.name ?? '',
    chargeRate: String(Number(g?.defaultCharge ?? 0)),
    labourRate: String(Number(labourFor(tailors, garments, tailorId, gid))),
    measurements: { ...(latest ?? {}) },
  }
}

export function itemError(d: ItemDraft) {
  if (!d.garmentTypeId) return 'Choose the garment'
  const q = Number(d.qty)
  if (!Number.isInteger(q) || q < 1) return 'Pieces must be a whole number, 1 or more'
  if (d.chargeRate === '' || Number(d.chargeRate) < 0) return 'Enter the charge'
  return undefined
}

export function toJobInput(f: { expectedDate: string; gstApplied: boolean; discount: string; notes: string; internalNotes: string; bookNo?: string }, items: ItemDraft[], costs: CostDraft[]): JobInput {
  return {
    ...(f.bookNo !== undefined ? { bookNo: f.bookNo.trim() || null } : {}),
    expectedDate: f.expectedDate,
    gstApplied: f.gstApplied,
    discount: Number(f.discount) || 0,
    notes: f.notes.trim() || undefined,
    internalNotes: f.internalNotes.trim() || undefined,
    items: items.map((d) => ({
      id: d.id,
      garmentTypeId: Number(d.garmentTypeId),
      description: d.description.trim() || undefined,
      qty: Number(d.qty),
      chargeRate: Number(d.chargeRate) || 0,
      tailorId: d.tailorId ? Number(d.tailorId) : null,
      labourRate: Number(d.labourRate) || 0,
      measurements: Object.fromEntries(Object.entries(d.measurements).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)),
      instructions: d.instructions.trim() || undefined,
      ownFabric: d.ownFabric,
      measuredById: d.measuredById ? Number(d.measuredById) : null,
    })),
    costs: costs.filter((c) => Number(c.charge) > 0 && c.kind.trim()).map((c) => ({ kind: c.kind.trim(), description: c.description.trim() || undefined, charge: Number(c.charge) })),
  }
}

// Saved job → form state (edit screen).
export function fromJob(job: Job) {
  return {
    items: job.items.map<ItemDraft>((i) => ({
      key: `i${++seq}`, id: i.id, garmentTypeId: String(i.garmentTypeId), description: i.description, qty: String(i.qty),
      chargeRate: String(Number(i.chargeRate)), tailorId: i.tailorId ? String(i.tailorId) : '', labourRate: String(Number(i.labourRate)),
      measurements: { ...i.measurements }, instructions: i.instructions ?? '', ownFabric: i.ownFabric, measuredById: i.measuredById ? String(i.measuredById) : '',
    })),
    costs: job.costs.map<CostDraft>((c) => ({ key: `c${++seq}`, kind: c.kind, description: c.description ?? '', charge: String(Number(c.charge)) })),
  }
}

// Shop item on the job form / "Add items": sold (billed now) or used for the stitching (not billed).
export type ProductDraft = { key: string; item: StockItem; qty: string; rate: string; discountPct: string; included: boolean }
export const newProduct = (item: StockItem, included = false): ProductDraft => ({ key: `p${++seq}`, item, qty: '1', rate: String(Number(item.sellingPrice)), discountPct: '', included })
const r2 = (n: number) => Math.round(n * 100) / 100
export const productAmount = (d: ProductDraft) => (d.included ? 0 : r2((Number(d.qty) || 0) * (Number(d.rate) || 0) * (1 - (Number(d.discountPct) || 0) / 100)))
export const productsTotal = (ds: ProductDraft[]) => r2(ds.reduce((s, d) => s + productAmount(d), 0))
export function productError(d: ProductDraft) {
  const q = Number(d.qty)
  if (!(q > 0)) return 'Enter a quantity above 0'
  if (!d.item.product.unit.allowDecimal && !Number.isInteger(q)) return `Whole ${d.item.product.unit.code} only`
  if (!d.included && !(Number(d.rate) > 0)) return 'Enter the price'
  return undefined
}
export const toProductInput = (ds: ProductDraft[]): JobProductInput[] =>
  ds.map((d) => ({ variantId: d.item.id, qty: Number(d.qty), rate: d.included ? 0 : Number(d.rate) || 0, discountPct: d.included ? 0 : Number(d.discountPct) || 0, included: d.included }))
