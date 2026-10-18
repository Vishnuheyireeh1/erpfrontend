import { api } from '@/lib/api'
import type { Brand, BrandList } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export const brandApi = {
  list: (p: { search?: string; status?: string; withDues?: boolean; page?: number; pageSize?: number }) => api.get<BrandList>(`/brands?${qs(p)}`),
  get: (id: number) => api.get<{ item: Brand }>(`/brands/${id}`).then((r) => r.item),
  create: (body: unknown) => api.post<{ item: Brand }>('/brands', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: Brand }>(`/brands/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/brands/${id}`),
}
