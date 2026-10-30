import { api, ApiError } from '@/lib/api'
import type { Option, Product, ProductListItem, ProductListParams } from '../types'

type ListResponse = { items: ProductListItem[]; total: number; page: number; pageSize: number }

function toQuery(p: ProductListParams) {
  const q = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize), status: p.status })
  if (p.search) q.set('search', p.search)
  if (p.type) q.set('type', p.type)
  if (p.productTypeId) q.set('productTypeId', String(p.productTypeId))
  if (p.categoryId) q.set('categoryId', String(p.categoryId))
  if (p.brandId) q.set('brandId', String(p.brandId))
  return q.toString()
}

// Image upload uses multipart/form-data, so it bypasses the JSON helper.
async function uploadImage(id: number, file: File) {
  const body = new FormData()
  body.append('image', file)
  const res = await fetch(`/api/products/${id}/image`, { method: 'POST', credentials: 'include', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.message ?? 'Could not upload the image')
  return data.imagePath as string
}

export const productsApi = {
  list: (params: ProductListParams) => api.get<ListResponse>(`/products?${toQuery(params)}`),
  get: (id: number) => api.get<{ item: Product }>(`/products/${id}`).then((r) => r.item),
  create: (body: unknown) => api.post<{ item: Product }>('/products', body).then((r) => r.item),
  update: (id: number, body: unknown) => api.put<{ item: Product }>(`/products/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete<{ success: boolean }>(`/products/${id}`),
  uploadImage,
  removeImage: (id: number) => api.delete<{ success: boolean }>(`/products/${id}/image`),
  // Dropdown lists (active entries only).
  options: (master: string) => api.get<{ items: Option[] }>(`/masters/${master}/options`).then((r) => r.items),
}
