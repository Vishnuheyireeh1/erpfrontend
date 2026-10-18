import { api } from '@/lib/api'
import type { PaymentMode } from '@/features/purchase/types'
import type { Brand } from '../types'
import type { BrandBill, BrandBillSummary, BrandPayment, BrandStatement, ClothEntry, ClothKind } from '../moneyTypes'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type Period = { brandId?: number; from?: string; to?: string }
export type NewPayment = { brandId: number; amount: number; mode: PaymentMode; docDate?: string; reference?: string; notes?: string }
export type NewCloth = { kind: ClothKind; description: string; qty: number; unit: string; date?: string; notes?: string }

export const brandMoneyApi = {
  deliver: (orderId: number, body: { itemIds: number[]; gstRate: number; docDate?: string; notes?: string }) =>
    api.post<{ item: BrandBill }>(`/brand-orders/${orderId}/deliver`, body).then((r) => r.item),
  bills: (p: Period & { orderId?: number }) => api.get<{ items: BrandBillSummary[] }>(`/brand-bills?${qs(p)}`).then((r) => r.items),
  bill: (id: number) => api.get<{ item: BrandBill }>(`/brand-bills/${id}`).then((r) => r.item),
  cancelBill: (id: number, reason: string) => api.post<{ item: BrandBill }>(`/brand-bills/${id}/cancel`, { reason }).then((r) => r.item),
  payments: (p: Period) => api.get<{ items: BrandPayment[] }>(`/brand-payments?${qs(p)}`).then((r) => r.items),
  pay: (body: NewPayment) => api.post<{ brand: Brand }>('/brand-payments', body).then((r) => r.brand),
  cancelPayment: (id: number, reason: string) => api.post(`/brand-payments/${id}/cancel`, { reason }),
  statement: (brandId: number) => api.get<BrandStatement>(`/brands/${brandId}/statement`),
  addCloth: (orderId: number, body: NewCloth) => api.post<{ items: ClothEntry[] }>(`/brand-orders/${orderId}/cloth`, body).then((r) => r.items),
  removeCloth: (orderId: number, entryId: number) => api.delete<{ items: ClothEntry[] }>(`/brand-orders/${orderId}/cloth/${entryId}`).then((r) => r.items),
  report: <T>(kind: string, p: Period) => api.get<T>(`/reports/brands/${kind}?${qs(p)}`),
}
