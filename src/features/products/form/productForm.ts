import type { Product, ProductType } from '../types'

// Form state is all strings (inputs) — converted to numbers only when saving.

export type VariantRow = {
  key: string // React key (id for saved rows, random for new ones)
  id?: number
  sizeId: number | null
  colourId: number | null
  sku?: string
  stockQty?: string // saved variants only (read-only here; changed through Inventory)
  barcode: string
  purchasePrice: string
  sellingPrice: string
  mrp: string
  minStock: string
  isActive: boolean
}

export type ProductFormState = {
  name: string
  type: ProductType | ''
  categoryId: string
  unitId: string
  taxRateId: string
  hsnCode: string
  fabric: string
  description: string
  isActive: boolean
  hasVariants: boolean // false = one variant without size / colour
  sizeIds: number[]
  colourIds: number[]
  variants: VariantRow[]
}

export type FormErrors = Partial<Record<string, string>>

let keySeq = 0
export const newKey = () => `new-${++keySeq}`

export function emptyVariant(sizeId: number | null = null, colourId: number | null = null): VariantRow {
  return { key: newKey(), sizeId, colourId, barcode: '', purchasePrice: '', sellingPrice: '', mrp: '', minStock: '0', isActive: true }
}

export function emptyForm(): ProductFormState {
  return {
    name: '', type: '', categoryId: '', unitId: '', taxRateId: '', hsnCode: '', fabric: '',
    description: '', isActive: true, hasVariants: false, sizeIds: [], colourIds: [], variants: [emptyVariant()],
  }
}

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v))
// "1450.00" → "1450"
const num = (v: string | null) => (v === null ? '' : String(Number(v)))

// Saved variants shown in size order (S, M, L), then colour name.
function sortVariants(variants: Product['variants']) {
  return [...variants].sort(
    (a, b) =>
      (a.size?.sortOrder ?? 0) - (b.size?.sortOrder ?? 0) ||
      (a.colour?.name ?? '').localeCompare(b.colour?.name ?? ''),
  )
}

export function fromProduct(product: Product): ProductFormState {
  const p = { ...product, variants: sortVariants(product.variants) }
  const hasVariants = p.variants.some((v) => v.sizeId || v.colourId)
  return {
    name: p.name, type: p.type, categoryId: str(p.categoryId), unitId: str(p.unitId),
    taxRateId: str(p.taxRateId), hsnCode: str(p.hsnCode), fabric: str(p.fabric), description: str(p.description),
    isActive: p.isActive,
    hasVariants,
    sizeIds: [...new Set(p.variants.map((v) => v.sizeId).filter((id): id is number => id !== null))],
    colourIds: [...new Set(p.variants.map((v) => v.colourId).filter((id): id is number => id !== null))],
    variants: p.variants.map((v) => ({
      key: `id-${v.id}`, id: v.id, sizeId: v.sizeId, colourId: v.colourId, sku: v.sku, stockQty: v.stockQty, barcode: v.barcode,
      purchasePrice: num(v.purchasePrice), sellingPrice: num(v.sellingPrice), mrp: num(v.mrp),
      minStock: num(v.minStock), isActive: v.isActive,
    })),
  }
}

// Rebuild variant rows from the chosen sizes × colours, keeping rows that already exist.
export function syncVariants(form: ProductFormState): VariantRow[] {
  if (!form.hasVariants) {
    const plain = form.variants.find((v) => !v.sizeId && !v.colourId)
    return [plain ?? { ...emptyVariant(), ...pricesFrom(form.variants[0]) }]
  }
  const sizes = form.sizeIds.length ? form.sizeIds : [null]
  const colours = form.colourIds.length ? form.colourIds : [null]
  const template = form.variants[0]
  const rows: VariantRow[] = []
  for (const sizeId of sizes) {
    for (const colourId of colours) {
      if (sizeId === null && colourId === null) continue
      const existing = form.variants.find((v) => v.sizeId === sizeId && v.colourId === colourId)
      rows.push(existing ?? { ...emptyVariant(sizeId, colourId), ...pricesFrom(template) })
    }
  }
  return rows
}

// New rows copy prices from the first row so you don't retype them.
function pricesFrom(v?: VariantRow) {
  if (!v) return {}
  return { purchasePrice: v.purchasePrice, sellingPrice: v.sellingPrice, mrp: v.mrp, minStock: v.minStock }
}

const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0

export function validateForm(f: ProductFormState): FormErrors {
  const e: FormErrors = {}
  if (!f.name.trim()) e.name = 'Enter the product name'
  if (!f.type) e.type = 'Choose a product type'
  if (!f.categoryId) e.categoryId = 'Choose a category'
  if (!f.unitId) e.unitId = 'Choose a unit'
  if (f.hsnCode && !/^(\d{4}|\d{6}|\d{8})$/.test(f.hsnCode)) e.hsnCode = 'HSN code must be 4, 6 or 8 digits'
  if (f.hasVariants && f.variants.length === 0) e.variants = 'Choose at least one size or colour'
  f.variants.forEach((v) => {
    if (!isNum(v.sellingPrice)) e[`${v.key}.sellingPrice`] = 'Required'
    if (v.purchasePrice && !isNum(v.purchasePrice)) e[`${v.key}.purchasePrice`] = 'Invalid'
    if (v.mrp && !isNum(v.mrp)) e[`${v.key}.mrp`] = 'Invalid'
  })
  if (Object.keys(e).some((k) => k.includes('.'))) e.variants ??= 'Fix the highlighted variant prices'
  return e
}

export function toPayload(f: ProductFormState) {
  const id = (v: string) => (v ? Number(v) : null)
  return {
    name: f.name.trim(), type: f.type, categoryId: id(f.categoryId),
    unitId: id(f.unitId), taxRateId: id(f.taxRateId), hsnCode: f.hsnCode.trim() || null,
    fabric: f.fabric.trim() || null, description: f.description.trim() || null, isActive: f.isActive,
    variants: f.variants.map((v) => ({
      id: v.id, sizeId: v.sizeId, colourId: v.colourId, barcode: v.barcode.trim() || null,
      purchasePrice: Number(v.purchasePrice || 0), sellingPrice: Number(v.sellingPrice),
      mrp: v.mrp ? Number(v.mrp) : null, minStock: Number(v.minStock || 0), isActive: v.isActive,
    })),
  }
}
