import type { Tender } from '@/features/sales/types'

export type { Paged } from '@/features/purchase/types'

export type JobStatus = 'PENDING' | 'CUTTING' | 'STITCHING' | 'TRIAL' | 'READY' | 'DELIVERED' | 'CANCELLED'

export type JobSummary = {
  id: number
  docNo: string
  bookNo: string | null // paper order book number
  customerId: number
  customerName: string
  customerPhone: string | null
  docDate: string
  expectedDate: string
  status: JobStatus
  grandTotal: string
  paidAmount: string
  returnedAmount: string
  dueAmount: number
  overdue: boolean
  items: { description: string; qty: number; tailor: { name: string } | null }[]
}

export type JobItem = {
  id: number
  garmentTypeId: number
  description: string
  qty: number
  chargeRate: string
  tailorId: number | null
  labourRate: string
  labourNote: string | null // why the stitching pay was changed
  measurements: Record<string, string>
  instructions: string | null
  ownFabric: boolean
  imagePath: string | null
  garmentType: { name: string; fields: string[] }
  tailor: { id: number; name: string; payType: 'PIECE' | 'SALARY' } | null
}

// Shop item on a job: sold (billed, paid in full) or included (used for the stitching, not billed).
export type JobMaterial = {
  id: number
  variantId: number
  description: string
  qty: string
  unitCost: string
  included: boolean
  rate: string
  discountPct: string
  amount: string
  gstRate: string
  taxable: string
  returnedQty: string
  createdBy: string
  createdAt: string
  variant: { id: number; sku: string; product: { unit: { code: string } } }
}

// Extra charge printed on the bill (embroidery ₹500 …).
export type JobCost = { id?: number; kind: string; description: string | null; charge: string | number }

// WORKER = our per-piece worker did it (owed to them at Ready) · SALARIED = cost only · PAID = paid out now
export type CostPaidBy = 'WORKER' | 'SALARIED' | 'PAID'
// What the shop spends on the job (any time, even after delivery).
export type JobCostEntry = {
  id: number
  categoryId: number
  category: { id: number; name: string }
  jobItemId: number | null
  auto: boolean
  date: string
  description: string | null
  qty: string
  rate: string
  amount: string
  paidBy: CostPaidBy
  mode: 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE' | null
  tailorId: number | null // who did the work
  tailor: { id: number; code: string; name: string; payType: 'PIECE' | 'SALARY' } | null
  createdBy: string
}

export type Job = Omit<JobSummary, 'items'> & {
  customer: { id: number; code: string; name: string; phone: string | null; address: string | null; city: string | null }
  parentJob: { id: number; docNo: string } | null
  alterations: { id: number; docNo: string; status: JobStatus }[]
  taxMode: 'INTRA' | 'INTER'
  gstRate: string
  chargeTotal: string
  discount: string
  taxableTotal: string
  cgstTotal: string
  sgstTotal: string
  igstTotal: string
  roundOff: string
  notes: string | null
  internalNotes: string | null
  deliveredAt: string | null
  createdBy: string
  createdAt: string
  cancelReason: string | null
  amountInWords: string
  items: JobItem[]
  materials: JobMaterial[]
  costs: JobCost[]
  costEntries: JobCostEntry[]
  logs: { id: number; fromStatus: JobStatus | null; toStatus: JobStatus; note: string | null; by: string; at: string }[]
  allocations: { id: number; amount: string; receipt: { id: number; docNo: string; docDate: string; tenders: Tender[] } }[]
  creditAllocations: { id: number; amount: string; return: { id: number; docNo: string } }[]
  returns: { id: number; docNo: string; docDate: string; grandTotal: string; refundAmount: string; status: 'POSTED' | 'CANCELLED' }[]
  // Job costing = stitching only. sold = items the customer paid for on this bill (a shop sale, shown apart).
  cost: {
    charged: number; chargedGst: number; materialCost: number; labourCost: number; otherCost: number; costTotal: number; profit: number
    sold: { taxable: number; cost: number; profit: number }
  }
}

export type JobCounts = { overdue: number; dueToday: number; ready: number }

// Assign workers → per garment: who stitches it (+ pay per piece, note) and who did each other work.
export type WorkerAssignment = {
  id: number
  tailorId: number | null
  labourRate: number
  labourNote: string | null
  works: { categoryId: number; tailorId: number | null; rate: number; note: string | null }[]
}
