import { api } from '@/lib/api'
import type { CostKind, Paged, Production, ProductionInput } from '../types'

const qs = (p: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(p).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '').map(([k, v]) => [k, String(v)])).toString()

export const productionApi = {
  list: (p: { productId?: number; search?: string; status?: string; from?: string; to?: string; page: number }) =>
    api.get<Paged<Omit<Production, 'outputs' | 'materials' | 'costs'>> & { totals: { pieces: number; stockCost: number } }>(`/production?${qs({ ...p, pageSize: 20 })}`),
  get: (id: number) => api.get<{ item: Production }>(`/production/${id}`).then((r) => r.item),
  create: (body: ProductionInput) => api.post<{ item: Production }>('/production', body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post(`/production/${id}/cancel`, { reason }),
}

export const costKindLabels: Record<CostKind, { label: string; hint: string }> = {
  TAILOR: { label: 'Tailor (per piece)', hint: "Added to the tailor's balance" },
  PAID: { label: 'Paid out now', hint: 'Cash / UPI paid — shows in the day book' },
  SALARIED: { label: 'Salaried staff', hint: 'Costing only — salary is already an expense' },
}
