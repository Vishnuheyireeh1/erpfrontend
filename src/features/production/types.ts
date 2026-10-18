import type { PaymentMode } from '@/features/purchase/types'

export type { Paged, PaymentMode } from '@/features/purchase/types'
export type CostKind = 'TAILOR' | 'PAID' | 'SALARIED'

type Variant = {
  id: number
  sku: string
  barcode: string
  sellingPrice: string
  size: { name: string } | null
  colour: { name: string } | null
  product: { id: number; name: string; unit: { code: string } }
}

export type ProductionLine = { id: number; variantId: number; qty: string; unitCost: string; variant: Variant }
export type ProductionCost = {
  id: number
  kind: CostKind
  description: string
  tailorId: number | null
  tailor: { id: number; code: string; name: string } | null
  qty: string | null
  rate: string | null
  amount: string
  mode: PaymentMode | null
  reference: string | null
}

export type Production = {
  id: number
  docNo: string
  docDate: string
  title: string | null
  notes: string | null
  status: 'POSTED' | 'CANCELLED'
  pieces: string
  materialCost: string
  labourCost: string
  paidCost: string
  salariedCost: string
  stockCost: string
  createdBy: string
  createdAt: string
  cancelReason: string | null
  cancelledBy: string | null
  made?: string // list only
  outputs: ProductionLine[]
  materials: ProductionLine[]
  costs: ProductionCost[]
}

export type ProductionInput = {
  docDate: string
  title?: string
  notes?: string
  outputs: { variantId: number; qty: number }[]
  materials: { variantId: number; qty: number }[]
  costs: { kind: CostKind; description: string; tailorId?: number; qty?: number; rate?: number; amount?: number; mode?: PaymentMode; reference?: string }[]
}
