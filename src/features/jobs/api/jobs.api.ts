import { api, ApiError } from '@/lib/api'
import type { TenderInput } from '@/features/sales/api/sales.api'
import type { CostPaidBy, Job, JobCounts, JobStatus, JobSummary, Paged, WorkerAssignment } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}

export type JobItemInput = {
  id?: number
  garmentTypeId: number
  description?: string
  qty: number
  chargeRate: number
  tailorId: number | null
  labourRate: number
  measurements: Record<string, string>
  instructions?: string
  ownFabric: boolean
  measuredById?: number | null
}
export type JobInput = {
  expectedDate: string
  gstApplied: boolean
  discount: number
  notes?: string
  internalNotes?: string
  bookNo?: string | null // left out = unchanged on edit
  items: JobItemInput[]
  costs: { kind: string; description?: string; charge: number }[] // extra charges on the bill
}
// Shop item on a job: sold at rate (GST included; paid now or left on the balance) or included in the stitching.
export type JobProductInput = { variantId: number; qty: number; rate: number; discountPct: number; included: boolean }
export type NewJob = JobInput & { customerId: number; docDate: string; parentJobId?: number | null; tenders: TenderInput[]; useAdvance: boolean; products: JobProductInput[] }
export type CostBody = { categoryId: number; date: string; description?: string; qty: number; rate: number; paidBy: CostPaidBy; mode: string | null; tailorId: number | null }
export type JobFilters = { view: string; search?: string; tailorId?: number; customerId?: number; from?: string; to?: string; page: number }

export const jobsApi = {
  list: (p: JobFilters) => api.get<Paged<JobSummary> & { counts: JobCounts }>(`/jobs?${qs({ ...p, pageSize: 20 })}`),
  chargeKinds: () => api.get<{ items: string[] }>('/jobs/charge-kinds').then((r) => r.items),
  get: (id: number) => api.get<{ item: Job }>(`/jobs/${id}`).then((r) => r.item),
  create: (body: NewJob) => api.post<{ item: Job }>('/jobs', body).then((r) => r.item),
  update: (id: number, body: JobInput) => api.put<{ item: Job }>(`/jobs/${id}`, body).then((r) => r.item),
  setStatus: (id: number, status: JobStatus, note?: string) => api.post<{ item: Job }>(`/jobs/${id}/status`, { status, note }).then((r) => r.item),
  deliver: (id: number, body: { docDate: string; tenders: TenderInput[]; useAdvance: boolean; note?: string }) =>
    api.post<{ item: Job }>(`/jobs/${id}/deliver`, body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post<{ item: Job }>(`/jobs/${id}/cancel`, { reason }).then((r) => r.item),
  setBookNo: (id: number, bookNo: string | null) => api.put<{ item: Job; warning: string | null }>(`/jobs/${id}/book-no`, { bookNo }),
  addItems: (id: number, body: { lines: JobProductInput[]; tenders: TenderInput[]; useAdvance: boolean }) => api.post<{ item: Job }>(`/jobs/${id}/items`, body).then((r) => r.item),
  removeItem: (id: number, materialId: number) => api.delete<{ item: Job }>(`/jobs/${id}/materials/${materialId}`).then((r) => r.item),
  // Multipart upload bypasses the JSON helper.
  uploadPhoto: async (id: number, itemId: number, file: File) => {
    const body = new FormData()
    body.append('image', file)
    const res = await fetch(`/api/jobs/${id}/items/${itemId}/photo`, { method: 'POST', credentials: 'include', body })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(res.status, data.message ?? 'Could not upload the photo')
    return data.imagePath as string
  },
  setMeasuredBy: (id: number, itemId: number, staffId: number | null) => api.post<{ item: Job }>(`/jobs/${id}/items/${itemId}/measured-by`, { staffId }).then((r) => r.item),
  removePhoto: (id: number, itemId: number) => api.delete(`/jobs/${id}/items/${itemId}/photo`),
  addCost: (id: number, body: CostBody) => api.post<{ item: Job }>(`/jobs/${id}/costs`, body).then((r) => r.item),
  updateCost: (id: number, entryId: number, body: CostBody) => api.put<{ item: Job }>(`/jobs/${id}/costs/${entryId}`, body).then((r) => r.item),
  // Who stitches each garment + pay per piece (Job work, after billing).
  setWorkers: (id: number, items: WorkerAssignment[]) => api.put<{ item: Job }>(`/jobs/${id}/workers`, { items }).then((r) => r.item),
  removeCost: (id: number, entryId: number) => api.delete<{ item: Job }>(`/jobs/${id}/costs/${entryId}`).then((r) => r.item),
}
