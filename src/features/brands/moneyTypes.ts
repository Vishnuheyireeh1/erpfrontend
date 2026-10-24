import type { PaymentMode } from '@/features/purchase/types'
import type { Brand } from './types'

// Brand money: delivery bills (BD/…), money received (BRP/…), statement, the brand's cloth register, reports.

export type BrandDocStatus = 'POSTED' | 'CANCELLED'

export type BrandBillLine = { id: number; kind: 'PIECE' | 'ITEM'; description: string; endCustomer: string | null; qty: string; unit: string; rate: string; amount: string }

export type BrandBillSummary = {
  id: number
  docNo: string
  orderId: number
  order: { docNo: string; theirOrderNo: string | null }
  brandId: number
  brandName: string
  brandGstin: string | null
  docDate: string
  gstRate: string
  taxableTotal: string
  cgstTotal: string
  sgstTotal: string
  igstTotal: string
  grandTotal: string
  status: BrandDocStatus
  dueAmount: number
  _count?: { items: number }
}

export type BrandBill = BrandBillSummary & {
  taxMode: 'INTRA' | 'INTER'
  grossTotal: string
  roundOff: string
  notes: string | null
  createdBy: string
  createdAt: string
  cancelReason: string | null
  lines: BrandBillLine[]
  order: { id: number; docNo: string; theirOrderNo: string | null; labelNote: string | null }
  brand: { id: number; code: string; name: string; phone: string | null; address: string | null; city: string | null; gstin: string | null }
  amountInWords: string
}

export type BrandPayment = {
  id: number
  docNo: string
  brandId: number
  brand: { name: string }
  docDate: string
  amount: string
  mode: PaymentMode
  reference: string | null
  notes: string | null
  status: BrandDocStatus
  cancelReason: string | null
}

export type StatementRow = { date: string; type: 'BILL' | 'PAYMENT'; id: number; docNo: string; detail: string; billed: number; received: number; balance: number }
export type BrandStatement = { brand: Brand; opening: number; rows: StatementRow[]; closing: number }

export type ClothKind = 'RECEIVED' | 'USED' | 'RETURNED'
export type ClothEntry = { id: number; date: string; kind: ClothKind; description: string; qty: string; unit: string; notes: string | null; createdBy: string }
export type ClothLine = { description: string; unit: string; received: number; used: number; returned: number; left: number }
export const clothKindLabel: Record<ClothKind, string> = { RECEIVED: 'Received from brand', USED: 'Used for pieces', RETURNED: 'Given back to brand' }

export type OrderBillRef = { id: number; docNo: string; docDate: string; grandTotal: string; gstRate: string; status: BrandDocStatus; _count: { items: number } }

// Reports
export type SummaryRow = { brandId: number; code: string; name: string; orders: number; piecesOrdered: number; piecesDelivered: number; billed: number; income: number; received: number; pending: number }
export type PendingRow = { orderId: number; docNo: string; brand: string; theirOrderNo: string | null; due: string; late: boolean; piece: string; endCustomer: string | null; qty: number; tailor: string | null; stage: 'IN_WORK' | 'READY'; value: number }
export type ProfitRow = { orderId: number; docNo: string; docDate: string; brand: string; status: string; pieces: number; delivered: number; billed: number; ourCloth: number; tailorPay: number; otherCosts: number; profit: number }
export type ClothRow = ClothLine & { orderId: number; docNo: string; brand: string; orderStatus: string }
