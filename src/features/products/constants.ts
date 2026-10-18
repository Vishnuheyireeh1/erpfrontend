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

// Product photo URL (served by the backend, login required).
export function productImageUrl(imagePath: string | null) {
  return imagePath ? `/api/uploads/${imagePath}` : null
}
