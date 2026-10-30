import type { Tone } from '@/components/ui/Badge'
import type { ProductType } from './types'

export const productTypeMeta: Record<ProductType, { label: string; hint: string; tone: Tone }> = {
  READY_MADE: { label: 'Ready-made', hint: 'Bought from suppliers and resold', tone: 'info' },
  FINISHED: { label: 'Own-made', hint: 'Made in-house (production / stitching)', tone: 'brand' },
  RAW_MATERIAL: { label: 'Raw material', hint: 'Fabric, lining … used or sold by measure', tone: 'pending' },
  ACCESSORY: { label: 'Accessory', hint: 'Buttons, zips, laces …', tone: 'neutral' },
  SERVICE: { label: 'Service', hint: 'Stitching, alteration — no stock', tone: 'success' },
}

export const productTypeOptions = (Object.keys(productTypeMeta) as ProductType[]).map((value) => ({
  value,
  label: productTypeMeta[value].label,
}))

// 'How it works' choices for a product type (Masters → Product types / + New type on the product form).
export const productKindOptions: { value: ProductType; label: string }[] = [
  { value: 'READY_MADE', label: 'Item with stock (bought and sold)' },
  { value: 'ACCESSORY', label: 'Accessory (buttons, lace …)' },
  { value: 'RAW_MATERIAL', label: 'Raw material (cloth by metre)' },
  { value: 'FINISHED', label: 'Own-made (we make it)' },
  { value: 'SERVICE', label: 'Service (no stock)' },
]
export const kindLabel = (k: ProductType) => productKindOptions.find((o) => o.value === k)?.label ?? k

// Product photo URL (served by the backend, login required).
export function productImageUrl(imagePath: string | null) {
  return imagePath ? `/api/uploads/${imagePath}` : null
}
