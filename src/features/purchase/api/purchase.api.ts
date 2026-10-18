import { api } from '@/lib/api'
import type { Bill, BillSummary, Paged, Payment, PaymentMode, Statement, Supplier, UnpaidBill } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type BillLineInput = { variantId: number; qty: number; rate: number; discountPct: number; gstRate: number }
export type NewBill = {
  supplierId: number
  supplierInvoiceNo: string
  supplierInvoiceDate: string
  docDate: string
  otherCharges: number
  billDiscountPct: number
  billDiscount: number
  chargesGstRate: number
  freightSeparate: number
  freightNote?: string
  freightMode?: string | null // transporter paid now (null = still to pay)
  notes?: string
  lines: BillLineInput[]
  payNow?: { amount: number; mode: PaymentMode; reference?: string } | null
}
export type NewPayment = {
  supplierId: number
  docDate: string
  amount: number
  mode: PaymentMode
  reference?: string
  notes?: string
  allocations?: { invoiceId: number; amount: number }[]
}

export const supplierApi = {
  list: (p: { search?: string; status?: string; withDues?: boolean; page?: number; pageSize?: number }) =>
    api.get<Paged<Supplier> & { totalDue: number }>(`/suppliers?${qs(p)}`),
  get: (id: number) => api.get<{ item: Supplier }>(`/suppliers/${id}`).then((r) => r.item),
  create: (body: unknown) => api.post<{ item: Supplier }>('/suppliers', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: Supplier }>(`/suppliers/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/suppliers/${id}`),
  statement: (id: number) => api.get<Statement>(`/suppliers/${id}/statement`),
  unpaidBills: (id: number) => api.get<{ items: UnpaidBill[] }>(`/suppliers/${id}/unpaid-bills`).then((r) => r.items),
}

export const purchaseApi = {
  list: (p: { search?: string; supplierId?: number; status?: string; from?: string; to?: string; page: number }) =>
    api.get<Paged<BillSummary>>(`/purchases?${qs({ ...p, pageSize: 20 })}`),
  get: (id: number) => api.get<{ item: Bill }>(`/purchases/${id}`).then((r) => r.item),
  create: (body: NewBill) => api.post<{ item: Bill }>('/purchases', body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post<{ item: Bill }>(`/purchases/${id}/cancel`, { reason }).then((r) => r.item),
  freightPaid: (id: number, body: { mode: string; date: string }) => api.post<{ item: Bill }>(`/purchases/${id}/freight-paid`, body).then((r) => r.item),

  payments: (p: { search?: string; supplierId?: number; status?: string; from?: string; to?: string; page: number }) =>
    api.get<Paged<Payment>>(`/supplier-payments?${qs({ ...p, pageSize: 20 })}`),
  payment: (id: number) => api.get<{ item: Payment }>(`/supplier-payments/${id}`).then((r) => r.item),
  pay: (body: NewPayment) => api.post<{ item: Payment }>('/supplier-payments', body).then((r) => r.item),
  cancelPayment: (id: number, reason: string) => api.post(`/supplier-payments/${id}/cancel`, { reason }),

  createReturn: (body: { invoiceId: number; docDate: string; reason: string; lines: { purchaseLineId: number; qty: number }[] }) =>
    api.post<{ item: { id: number; docNo: string } }>('/purchase-returns', body).then((r) => r.item),
  cancelReturn: (id: number, reason: string) => api.post(`/purchase-returns/${id}/cancel`, { reason }),
}

export const paymentModeLabels: Record<PaymentMode, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank transfer', CHEQUE: 'Cheque' }
export const paymentModeOptions = (Object.keys(paymentModeLabels) as PaymentMode[]).map((value) => ({ value, label: paymentModeLabels[value] }))
