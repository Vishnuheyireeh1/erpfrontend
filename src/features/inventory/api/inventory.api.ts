import { api, ApiError } from '@/lib/api'
import type { DocKind, Movement, Paged, StockDocument, StockItem, StockStatus, StockSummary } from '../types'

export type StockListParams = {
  search?: string
  categoryId?: number
  status: StockStatus
  page: number
  pageSize: number
  ids?: string // "12,15" — exact items (label printing)
  productId?: number
}
export type DocLine = { variantId: number; qty: number; unitCost?: number }
export type OpeningCheck = { lines: number; value: number; errors: { row: number; message: string }[]; errorCount: number }

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)))
  return q.toString()
}

async function upload<T>(path: string, file: File, fields: Record<string, string> = {}) {
  const body = new FormData()
  Object.entries(fields).forEach(([k, v]) => body.append(k, v))
  body.append('file', file)
  const res = await fetch(`/api/stock${path}`, { method: 'POST', credentials: 'include', body }).catch(() => {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.")
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 422) throw new ApiError(res.status, data.message ?? 'Upload failed')
  return data as T
}

export const inventoryApi = {
  list: (p: StockListParams) => api.get<Paged<StockItem>>(`/stock?${qs(p)}`),
  summary: () => api.get<StockSummary>('/stock/summary'),
  ledger: (variantId: number, page: number, order = 'newest') =>
    api.get<Paged<Movement> & { item: StockItem }>(`/stock/items/${variantId}/ledger?page=${page}&order=${order}`),

  documents: (p: { kind?: DocKind; from?: string; to?: string; page: number }) =>
    api.get<Paged<StockDocument>>(`/stock/documents?${qs({ ...p, pageSize: 20 })}`),
  document: (id: number) => api.get<{ item: StockDocument }>(`/stock/documents/${id}`).then((r) => r.item),
  createOpening: (body: { docDate?: string; note?: string; lines: DocLine[] }) =>
    api.post<{ item: StockDocument }>('/stock/opening', body).then((r) => r.item),
  createAdjustment: (body: { docDate?: string; reason: string; note?: string; lines: DocLine[] }) =>
    api.post<{ item: StockDocument }>('/stock/adjustments', body).then((r) => r.item),
  cancel: (id: number, reason: string) =>
    api.post<{ item: StockDocument }>(`/stock/documents/${id}/cancel`, { reason }).then((r) => r.item),

  checkOpeningFile: (file: File) => upload<OpeningCheck>('/opening/import/check', file),
  importOpeningFile: (file: File, docDate: string) =>
    upload<{ imported: boolean; document?: { id: number; docNo: string; totalValue: string }; lines?: number } & Partial<OpeningCheck>>(
      '/opening/import',
      file,
      { docDate },
    ),

  async downloadOpeningTemplate() {
    const res = await fetch('/api/stock/opening/template', { credentials: 'include' })
    if (!res.ok) throw new ApiError(res.status, 'Could not download the template')
    const url = URL.createObjectURL(await res.blob())
    Object.assign(document.createElement('a'), { href: url, download: 'sairandhri-opening-stock.xlsx' }).click()
    URL.revokeObjectURL(url)
  },
}
