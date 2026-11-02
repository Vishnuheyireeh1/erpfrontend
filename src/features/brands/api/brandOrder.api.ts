import { api } from '@/lib/api'
import type { BrandOrder, BrandOrderSummary, CostPaidBy } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type MaterialInput = { variantId: number; qty: number; rate: number; discountPct: number; charged: boolean }
export type PieceInput = {
  id?: number
  garmentTypeId: number
  description?: string
  endCustomer?: string
  qty: number
  chargeRate: number
  brandCloth: boolean
  measurements: Record<string, string>
  instructions?: string
  tailorId: number | null
  labourRate: number
  measuredById: number | null
  cutting: { tailorId: number; rate: number } | null // cutting master (see BrandCuttingFields)
  materials: MaterialInput[]
}
export type CostInput = { categoryId: number; itemId: number | null; date: string; description?: string; qty: number; rate: number; paidBy: CostPaidBy; mode: string | null; tailorId: number | null }
export type OrderInput = { theirOrderNo?: string; expectedDate: string; labelNote?: string; notes?: string; items: PieceInput[] }
export type OrderListParams = { view?: string; search?: string; brandId?: number; from?: string; to?: string; order?: string; page?: number; pageSize?: number }

const item = (r: { item: BrandOrder }) => r.item

export const brandOrderApi = {
  list: (p: OrderListParams) => api.get<{ items: BrandOrderSummary[]; total: number; page: number; pageSize: number }>(`/brand-orders?${qs({ pageSize: 20, ...p })}`),
  get: (id: number) => api.get<{ item: BrandOrder }>(`/brand-orders/${id}`).then(item),
  create: (body: OrderInput & { brandId: number; docDate?: string }) => api.post<{ item: BrandOrder }>('/brand-orders', body).then(item),
  update: (id: number, body: OrderInput) => api.put<{ item: BrandOrder }>(`/brand-orders/${id}`, body).then(item),
  stage: (id: number, itemIds: number[], stage: 'IN_WORK' | 'READY') => api.post<{ item: BrandOrder }>(`/brand-orders/${id}/stage`, { itemIds, stage }).then(item),
  cancel: (id: number, reason: string) => api.post<{ item: BrandOrder }>(`/brand-orders/${id}/cancel`, { reason }).then(item),
  addMaterials: (id: number, itemId: number, lines: MaterialInput[]) => api.post<{ item: BrandOrder }>(`/brand-orders/${id}/materials`, { itemId, lines }).then(item),
  setWorkers: (id: number, items: { id: number; tailorId: number | null; labourRate: number; works: { categoryId: number; tailorId: number; rate: number }[] }[]) => api.post<{ item: BrandOrder }>(`/brand-orders/${id}/workers`, { items }).then(item),
  addCost: (id: number, body: CostInput) => api.post<{ item: BrandOrder }>(`/brand-orders/${id}/costs`, body).then(item),
  removeCost: (id: number, costId: number) => api.delete<{ item: BrandOrder }>(`/brand-orders/${id}/costs/${costId}`).then(item),
  removeMaterial: (id: number, materialId: number) => api.delete<{ item: BrandOrder }>(`/brand-orders/${id}/materials/${materialId}`).then(item),
}
