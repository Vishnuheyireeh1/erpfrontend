import { api } from '@/lib/api'
import type { ListParams, ListResult, MasterKey, MasterRow } from '../types'

function toQuery(params: ListParams) {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    status: params.status,
  })
  if (params.search) q.set('search', params.search)
  if (params.parentId !== undefined) q.set('parentId', String(params.parentId))
  return q.toString()
}

type ItemResponse = { success: boolean; item: MasterRow }

export const mastersApi = {
  list: (key: MasterKey, params: ListParams) =>
    api.get<ListResult & { success: boolean }>(`/masters/${key}?${toQuery(params)}`),

  // Active rows only — for dropdowns (e.g. main categories).
  options: (key: MasterKey, parentId?: 'root' | number) =>
    api
      .get<{ items: MasterRow[] }>(
        `/masters/${key}/options${parentId !== undefined ? `?parentId=${parentId}` : ''}`,
      )
      .then((r) => r.items),

  create: (key: MasterKey, body: Record<string, unknown>) =>
    api.post<ItemResponse>(`/masters/${key}`, body).then((r) => r.item),

  update: (key: MasterKey, id: number, body: Record<string, unknown>) =>
    api.put<ItemResponse>(`/masters/${key}/${id}`, body).then((r) => r.item),

  remove: (key: MasterKey, id: number) => api.delete<{ success: boolean }>(`/masters/${key}/${id}`),
}
