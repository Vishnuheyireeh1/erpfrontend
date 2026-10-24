import { api } from '@/lib/api'
import type { AdvanceInfo, BillKind, BillRow, Customer, CustomerStatement, Paged, PaymentMode, Receipt, Sale, SalesReturn, UnpaidSale } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type TenderInput = { mode: PaymentMode; amount: number; reference?: string }
export type NewSale = {
  customerId: number | null
  walkInName?: string
  walkInPhone?: string
  docDate: string
  bookNo?: string
  billDiscount: number
  notes?: string
  lines: { variantId: number; qty: number; rate: number; discountPct: number }[]
  tenders: TenderInput[]
  useAdvance?: boolean
}
type DocFilters = { search?: string; customerId?: number; status?: string; kind?: BillKind; from?: string; to?: string; page: number }

export const customerApi = {
  list: (p: { search?: string; status?: string; withDues?: boolean; kind?: 'stitching' | 'shop'; page?: number; pageSize?: number }) =>
    api.get<Paged<Customer> & { totalDue?: number }>(`/customers?${qs(p)}`),
  get: (id: number) => api.get<{ item: Customer }>(`/customers/${id}`).then((r) => r.item),
  create: (body: unknown) => api.post<{ item: Customer }>('/customers', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: Customer }>(`/customers/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/customers/${id}`),
  statement: (id: number) => api.get<CustomerStatement>(`/customers/${id}/statement`),
  unpaidBills: (id: number) => api.get<{ items: UnpaidSale[] }>(`/customers/${id}/unpaid-bills`).then((r) => r.items),
  advance: (id: number) => api.get<AdvanceInfo>(`/customers/${id}/advance`),
}

export const salesApi = {
  list: (p: DocFilters) => api.get<Paged<BillRow> & { summary: { sales: number; received: number; returned: number } }>(`/sales?${qs({ ...p, pageSize: 20 })}`),
  get: (id: number) => api.get<{ item: Sale }>(`/sales/${id}`).then((r) => r.item),
  create: (body: NewSale) => api.post<{ item: Sale }>('/sales', body).then((r) => r.item),
  // Edit a bill of this month (same number); tenders = money taken now on top of what was already paid.
  update: (id: number, body: NewSale) => api.put<{ item: Sale }>(`/sales/${id}`, body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post<{ item: Sale }>(`/sales/${id}/cancel`, { reason }).then((r) => r.item),
  setBookNo: (id: number, bookNo: string | null) => api.put<{ item: Sale; warning: string | null }>(`/sales/${id}/book-no`, { bookNo }),

  receipts: (p: DocFilters) => api.get<Paged<Receipt>>(`/receipts?${qs({ ...p, pageSize: 20 })}`),
  receipt: (id: number) => api.get<{ item: Receipt }>(`/receipts/${id}`).then((r) => r.item),
  receive: (body: { customerId: number; docDate: string; tenders: TenderInput[]; notes?: string; allocations?: { invoiceId?: number; jobId?: number; amount: number }[] }) =>
    api.post<{ item: Receipt }>('/receipts', body).then((r) => r.item),
  cancelReceipt: (id: number, reason: string) => api.post(`/receipts/${id}/cancel`, { reason }),

  salesReturn: (id: number) => api.get<{ item: SalesReturn }>(`/sales-returns/${id}`).then((r) => r.item),
  createReturn: (body: { invoiceId?: number; jobId?: number; docDate: string; reason: string; refundMode: PaymentMode | null; lines: { salesLineId?: number; jobMaterialId?: number; qty: number }[] }) =>
    api.post<{ item: SalesReturn }>('/sales-returns', body).then((r) => r.item),
  cancelReturn: (id: number, reason: string) => api.post(`/sales-returns/${id}/cancel`, { reason }),
}
