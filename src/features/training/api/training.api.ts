import { api } from '@/lib/api'
import type { Batch, Course, EnrolmentStatus, FeeReceiptFull, Paged, PaymentMode, PendingFee, Student } from '../types'

const qs = (p: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(p).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '').map(([k, v]) => [k, String(v)])).toString()

type ListQ = { search?: string; status?: string; batchId?: number; courseId?: number; from?: string; to?: string }
export type EnrolBody = { batchId: number; joinedOn?: string; fee: number; notes?: string; firstPayment?: { amount: number; mode: PaymentMode; reference?: string } | null }
export type StudentBody = { name: string; phone?: string; guardianPhone?: string; address?: string; notes?: string }

export const trainingApi = {
  courses: () => api.get<{ items: Course[] }>('/training/courses').then((r) => r.items),
  saveCourse: (id: number | null, body: unknown) => (id ? api.put(`/training/courses/${id}`, body) : api.post('/training/courses', body)),
  removeCourse: (id: number) => api.delete(`/training/courses/${id}`),

  batches: (p: { courseId?: number; status?: string } = {}) => api.get<{ items: Batch[] }>(`/training/batches?${qs(p)}`).then((r) => r.items),
  saveBatch: (id: number | null, body: unknown) => (id ? api.put(`/training/batches/${id}`, body) : api.post('/training/batches', body)),
  removeBatch: (id: number) => api.delete(`/training/batches/${id}`),

  students: (p: ListQ & { page: number }) => api.get<Paged<Student>>(`/training/students?${qs({ ...p, pageSize: 20 })}`),
  student: (id: number) => api.get<{ item: Student }>(`/training/students/${id}`).then((r) => r.item),
  createStudent: (body: StudentBody & { enrol?: EnrolBody | null }) => api.post<{ item: Student }>('/training/students', body).then((r) => r.item),
  updateStudent: (id: number, body: StudentBody) => api.put<{ item: Student }>(`/training/students/${id}`, body).then((r) => r.item),
  removeStudent: (id: number) => api.delete(`/training/students/${id}`),
  enrol: (studentId: number, body: EnrolBody) => api.post<{ item: Student }>(`/training/students/${studentId}/enrol`, body).then((r) => r.item),
  updateEnrolment: (id: number, body: { fee: number; status: EnrolmentStatus; notes?: string }) => api.put<{ item: Student }>(`/training/enrolments/${id}`, body).then((r) => r.item),

  pending: (p: ListQ) => api.get<{ items: PendingFee[]; total: number; count: number }>(`/training/fees/pending?${qs(p)}`),
  receipts: (p: ListQ & { page: number }) => api.get<Paged<FeeReceiptFull> & { totalReceived: number }>(`/training/fees?${qs({ ...p, pageSize: 20 })}`),
  receipt: (id: number) => api.get<{ item: FeeReceiptFull }>(`/training/fees/${id}`).then((r) => r.item),
  pay: (body: { enrolmentId: number; docDate: string; amount: number; mode: PaymentMode; reference?: string; notes?: string }) =>
    api.post<{ item: FeeReceiptFull }>('/training/fees', body).then((r) => r.item),
  cancelReceipt: (id: number, reason: string) => api.post(`/training/fees/${id}/cancel`, { reason }),
}

export const enrolmentStatusLabels: Record<EnrolmentStatus, string> = { STUDYING: 'Studying', COMPLETED: 'Completed', DROPPED: 'Left' }
