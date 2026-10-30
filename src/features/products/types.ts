export type ProductType = 'RAW_MATERIAL' | 'READY_MADE' | 'FINISHED' | 'ACCESSORY' | 'SERVICE'

// One row in the product list.
// A product type from Masters (name + the built-in kind it works like).
export type ProductTypeRef = { id: number; name: string; kind: ProductType }

export type ProductListItem = {
  productType?: ProductTypeRef | null
  id: number
  code: string
  name: string
  type: ProductType
  imagePath: string | null
  isActive: boolean
  category: { name: string; parent: { name: string } | null }
  brand: { name: string } | null
  unit: { code: string }
  variantCount: number
  totalStock: number
  minPrice: number
  maxPrice: number
  costPerPiece: number | null // average cost of what is in stock (else the latest making)
  // own-made list only (type FINISHED)
  timesMade?: number
  piecesMade?: number
  lastMade?: string | null
}

export type ProductListParams = {
  search?: string
  type?: ProductType
  productTypeId?: number
  categoryId?: number
  brandId?: number
  status: 'all' | 'active' | 'inactive'
  page: number
  pageSize: number
}

export type Variant = {
  id: number
  sku: string
  barcode: string
  sizeId: number | null
  colourId: number | null
  size: { id: number; name: string; sortOrder: number } | null
  colour: { id: number; name: string; hexCode: string | null } | null
  purchasePrice: string // Decimal → string
  sellingPrice: string
  mrp: string | null
  minStock: string
  stockQty: string
  isActive: boolean
}

// Full product (edit page).
export type Product = {
  id: number
  code: string
  name: string
  productTypeId: number | null
  productType?: ProductTypeRef | null
  type: ProductType
  categoryId: number
  brandId: number | null
  unitId: number
  taxRateId: number | null
  hsnCode: string | null
  fabric: string | null
  description: string | null
  imagePath: string | null
  isActive: boolean
  unit: { id: number; name: string; code: string; allowDecimal: boolean }
  variants: Variant[]
}

// Simple dropdown option from the masters API.
export type Option = {
  id: number
  name: string
  parent?: { id: number; name: string } | null
  hexCode?: string | null
  code?: string
  allowDecimal?: boolean
  rate?: string
  kind?: ProductType // product types
}
