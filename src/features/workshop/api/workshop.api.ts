import { api } from '@/lib/api'
import type { CostCategory, GarmentType, Measurement, Paged, PayType, Tailor, TailorPayment, TailorStatement } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type TailorOption = {
  id: number; code: string; name: string; payType: PayType; stitches: boolean; speciality: string | null; staffId: number | null
  rates: { garmentTypeId: number; rate: string }[] // stitching pay per garment
  works: { categoryId: number; rate: string }[] // other work they do (Cutting, Lining …) + usual pay per piece
}

export const tailorApi = {
  list: (p: { search?: string; status?: string; work?: string; from?: string; to?: string; page?: number; pageSize?: number }) => api.get<Paged<Tailor>>(`/tailors?${qs(p)}`),
  options: () => api.get<{ items: TailorOption[] }>('/tailors/options').then((r) => r.items),
  get: (id: number) => api.get<{ item: Tailor }>(`/tailors/${id}`).then((r) => r.item),
  statement: (id: number) => api.get<TailorStatement>(`/tailors/${id}/statement`),
}

export const tailorPaymentApi = {
  list: (p: { search?: string; tailorId?: number; status?: string; from?: string; to?: string; page: number }) =>
    api.get<Paged<TailorPayment> & { totalPaid: number }>(`/tailor-payments?${qs({ ...p, pageSize: 20 })}`),
  create: (body: { tailorId: number; docDate: string; amount: number; mode: string; reference?: string; notes?: string }) =>
    api.post<{ item: TailorPayment }>('/tailor-payments', body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post(`/tailor-payments/${id}/cancel`, { reason }),
}

export const garmentApi = {
  list: (activeOnly = false) => api.get<{ items: GarmentType[] }>(`/garment-types${activeOnly ? '?active=1' : ''}`).then((r) => r.items),
  create: (body: unknown) => api.post<{ item: GarmentType }>('/garment-types', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: GarmentType }>(`/garment-types/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/garment-types/${id}`),
}

export const costCategoryApi = {
  list: () => api.get<{ items: CostCategory[] }>('/job-cost-categories').then((r) => r.items),
  create: (body: unknown) => api.post<{ item: CostCategory }>('/job-cost-categories', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: CostCategory }>(`/job-cost-categories/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/job-cost-categories/${id}`),
}

export const measurementApi = {
  list: (customerId: number) => api.get<{ items: Measurement[] }>(`/customers/${customerId}/measurements`).then((r) => r.items),
  create: (customerId: number, body: { garmentTypeId: number; takenOn: string; values: Record<string, string>; notes?: string }) =>
    api.post<{ item: Measurement }>(`/customers/${customerId}/measurements`, body).then((r) => r.item),
  remove: (customerId: number, id: number) => api.delete(`/customers/${customerId}/measurements/${id}`),
}

export const payTypeLabels: Record<PayType, string> = { PIECE: 'Per piece', SALARY: 'Salaried' }

// Measurement values in the garment's field order, then any older labels no longer in the template.
export function orderedValues(values: Record<string, string>, fields: string[] = []) {
  const extra = Object.keys(values).filter((k) => !fields.includes(k))
  return [...fields, ...extra].filter((k) => values[k]).map((k) => [k, values[k]] as const)
}
