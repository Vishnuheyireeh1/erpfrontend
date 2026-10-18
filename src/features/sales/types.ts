import type { DocStatus, PaymentMode } from '@/features/purchase/types'

export type { DocStatus, PaymentMode, Paged } from '@/features/purchase/types'

export type Customer = {
  id: number
  code: string
  name: string
  phone: string | null
  email: string | null
  gstin: string | null
  stateCode: string
  stateName?: string
  address: string | null
  city: string | null
  pincode: string | null
  openingBalance: string
  notes: string | null
  isActive: boolean
  billed?: number
  received?: number
  returned?: number
  refunded?: number
  balance: number // + = customer owes the shop, − = advance / credit
  jobs?: number // stitching jobs (not cancelled) — list only
  openJobs?: number // of them not handed over yet
}

export type Tender = { mode: PaymentMode; amount: string | number; reference?: string | null }

export type SaleSummary = {
  id: number
  docNo: string
  bookNo: string | null // paper bill book number
  docDate: string
  createdAt: string
  status: DocStatus
  customerId: number | null
  customerName: string
  customerPhone: string | null
  grandTotal: string
  paidAmount: string
  returnedAmount: string
  dueAmount: number
  _count?: { lines: number }
}

export type SaleLine = {
  id: number
  variantId: number
  description: string
  hsnCode: string | null
  qty: string
  rate: string
  discountPct: string
  amount: string
  gstRate: string
  taxable: string
  cgst: string
  sgst: string
  igst: string
  returnedQty: string
  variant: { id: number; sku: string; barcode: string; product: { unit: { code: string } } }
}

export type Sale = SaleSummary & {
  taxMode: 'INTRA' | 'INTER'
  customerGstin: string | null
  customer: { id: number; code: string; name: string; phone: string | null; gstin: string | null; address: string | null; city: string | null } | null
  grossTotal: string
  discountTotal: string
  taxableTotal: string
  cgstTotal: string
  sgstTotal: string
  igstTotal: string
  roundOff: string
  cashTendered: string
  changeReturned: string
  costTotal: string
  profit: number
  amountInWords: string
  notes: string | null
  createdBy: string
  cancelledBy: string | null
  cancelReason: string | null
  lines: SaleLine[]
  allocations: { id: number; amount: string; receipt: { id: number; docNo: string; docDate: string; tenders: Tender[] } }[]
  returns: { id: number; docNo: string; docDate: string; grandTotal: string; refundAmount: string; status: DocStatus }[]
  credits?: { id: number; amount: string; return: { id: number; docNo: string } }[]
}

export type Receipt = {
  id: number
  docNo: string
  docDate: string
  amount: string
  status: DocStatus
  notes: string | null
  cancelReason?: string | null
  customer: { id: number; name: string; code?: string; phone?: string | null } | null
  tenders: Tender[]
  allocated?: number
  advance?: number
  allocations?: { id: number; amount: string; invoice: { id: number; docNo: string; grandTotal: string } | null; job: { id: number; docNo: string; grandTotal: string } | null }[]
}

export type SalesReturn = {
  id: number
  docNo: string
  docDate: string
  reason: string
  status: DocStatus
  taxableTotal: string
  taxTotal: string
  grandTotal: string
  refundMode: PaymentMode | null
  refundAmount: string
  billCleared: string
  creditUsed: string
  cancelReason: string | null
  createdBy: string
  customer: { id: number; name: string } | null
  invoice: { id: number; docNo: string; customerName: string } | null
  job: { id: number; docNo: string; customerName: string } | null
  lines: { id: number; salesLineId: number; description: string; qty: string; total: string }[]
}

// Open bill or stitching job of a customer (for "receive money").
export type UnpaidSale = { kind: 'INV' | 'JOB'; id: number; docNo: string; docDate: string; grandTotal: number; dueAmount: number }
export type AdvanceInfo = { total: number; receipts: { id: number; docNo: string; free: number }[]; credits: { id: number; docNo: string; free: number }[] }

export type CustomerStatementRow = { type: 'BILL' | 'JOB' | 'RECEIPT' | 'RETURN' | 'REFUND'; id: number; docNo: string; date: string; detail: string; debit: number; credit: number; balance: number }
export type CustomerStatement = { customer: Customer; opening: number; rows: CustomerStatementRow[]; closing: number }

// Bill printer (Settings → Sales bills). direct = straight to the dot-matrix as plain text (no print window).
export type PrintSettings = { paperWidthIn: number; paperHeightIn: number; columns: number; mode?: 'browser' | 'direct'; printer?: string; feedLines?: number }

// Sales → All bills: one row per shop bill (INV/…) or stitching job bill (JOB/…).
export type BillKind = 'SHOP' | 'JOB'
export type BillRow = {
  kind: BillKind
  id: number
  docNo: string
  bookNo: string | null
  docDate: string
  customerName: string
  customerPhone: string | null
  grandTotal: number
  paidAmount: number
  returnedAmount: number
  dueAmount: number
  status: DocStatus
  stage: string | null // job stage (PENDING … DELIVERED) for stitching bills
  lines: number
}
