export type StockStatus = 'all' | 'in' | 'low' | 'out' | 'available'

// One sellable item (variant) with its current stock.
export type StockItem = {
  id: number
  sku: string
  barcode: string
  minStock: string
  stockQty: string
  avgCost: string
  stockValue: string
  sellingPrice: string
  purchasePrice: string
  mrp: string | null
  isActive: boolean
  size: { name: string; sortOrder: number } | null
  colour: { name: string; hexCode: string | null } | null
  product: {
    id: number
    code: string
    name: string
    imagePath: string | null
    unit: { code: string; allowDecimal: boolean }
    taxRate?: { rate: string } | null
    hsnCode?: string | null
    category: { name: string; parent: { name: string } | null }
  }
}

export type StockSummary = { stockValue: number; inStock: number; low: number; out: number }

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number }

export type MovementType =
  | 'OPENING' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'PURCHASE' | 'PURCHASE_RETURN'
  | 'SALE' | 'SALE_RETURN' | 'JOB_CONSUMPTION' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'CANCELLATION'

export type Movement = {
  id: string
  type: MovementType
  qty: string
  unitCost: string
  value: string
  balanceQty: string
  balanceValue: string
  refType: string
  refId: number
  refNo: string
  note: string | null
  movementDate: string
  createdBy: string
  createdAt: string
}

export type DocKind = 'OPENING' | 'ADJUSTMENT'
export type AdjustmentReason = 'OPENING' | 'DAMAGED' | 'LOST' | 'FOUND' | 'COUNT_CORRECTION' | 'SAMPLE' | 'OTHER'

export type StockDocument = {
  id: number
  docNo: string
  kind: DocKind
  status: 'POSTED' | 'CANCELLED'
  reason: AdjustmentReason
  docDate: string
  note: string | null
  totalValue: string
  createdBy: string
  createdAt: string
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  _count?: { lines: number }
  lines?: {
    id: number
    qty: string
    unitCost: string
    value: string
    variant: {
      id: number
      sku: string
      barcode: string
      size: { name: string } | null
      colour: { name: string } | null
      product: { id: number; name: string; unit: { code: string } }
    }
  }[]
}
