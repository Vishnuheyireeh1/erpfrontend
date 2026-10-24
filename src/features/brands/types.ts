import type { ClothEntry, ClothLine, OrderBillRef } from './moneyTypes'

// Partner brands — other brands Sairandhri stitches for (their label on the garment).
export type Brand = {
  id: number
  code: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstin: string | null
  stateCode: string
  stateName?: string
  address: string | null
  city: string | null
  pincode: string | null
  gstRate: string // usual GST % on their bills (0 = no GST)
  openingBalance: string
  notes: string | null
  isActive: boolean
  billed?: number
  paid?: number
  balance: number // + = they owe us
}

export type BrandList = { items: Brand[]; total: number; totalDue: number; page: number; pageSize: number }

export const GST_CHOICES = [
  { value: '0', label: 'No GST' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
]
export const gstLabel = (rate: string | number) => (Number(rate) ? `${Number(rate)}% GST` : 'No GST')

// Brand orders (BRO/…): pieces with their own end customer, measurements, rate and tailor; billed when delivered.
export type BrandOrderStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED'
export type PieceStage = 'IN_WORK' | 'READY' | 'DELIVERED'
type Sums = { pieces: number; inWork: number; ready: number; delivered: number; value: number }

export type BrandOrderSummary = Sums & {
  id: number
  docNo: string
  brandId: number
  brandName: string
  theirOrderNo: string | null
  docDate: string
  expectedDate: string
  labelNote: string | null
  status: BrandOrderStatus
}

export type BrandPiece = {
  id: number
  garmentTypeId: number
  garmentType: { id: number; name: string; fields: string[] }
  description: string
  endCustomer: string | null
  qty: number
  chargeRate: string
  brandCloth: boolean
  measurements: Record<string, string>
  instructions: string | null
  tailorId: number | null
  tailor: { id: number; name: string; payType: 'PIECE' | 'SALARY' } | null
  labourRate: string
  stage: PieceStage
  readyOn: string | null
  billId: number | null
}

export type BrandMaterial = {
  id: number
  itemId: number
  variantId: number
  variant: { sku: string; product: { unit: { code: string } } }
  description: string
  qty: string
  unitCost: string
  charged: boolean
  rate: string
  discountPct: string
  amount: string
}

export type BrandOrder = BrandOrderSummary & {
  brand: { id: number; code: string; name: string; phone: string | null; gstin: string | null; gstRate: string }
  notes: string | null
  createdBy: string
  createdAt: string
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  items: BrandPiece[]
  materials: BrandMaterial[]
  bills: OrderBillRef[]
  clothEntries: ClothEntry[]
  cloth: ClothLine[]
  costs: BrandCost[]
  profit?: OrderProfit
}

export type CostPaidBy = 'WORKER' | 'SALARIED' | 'PAID'
export type BrandCost = {
  id: number
  itemId: number | null
  item: { id: number; description: string; endCustomer: string | null } | null
  categoryId: number
  category: { id: number; name: string }
  date: string
  description: string | null
  qty: string
  rate: string
  amount: string
  paidBy: CostPaidBy
  mode: string | null
  tailorId: number | null
  tailor: { id: number; name: string } | null
  createdBy: string
}
// Profit so far: billed (before GST) − our cloth − stitching pay (per piece, ready / delivered) − other costs.
export type OrderProfit = { billed: number; ourCloth: number; tailorPay: number; otherCosts: number; profit: number }

export const stageLabel: Record<PieceStage, string> = { IN_WORK: 'In work', READY: 'Ready', DELIVERED: 'Delivered' }
export const stageTone: Record<PieceStage, 'pending' | 'success' | 'info'> = { IN_WORK: 'pending', READY: 'success', DELIVERED: 'info' }
