import { api } from '@/lib/api'
import type { Paged, Payslip, PayrollSheet, SalaryPayment, Staff, StaffDept, StaffInput } from '../types'

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)))
  return q.toString()
}

export const staffApi = {
  list: (p: { search?: string; status?: string; page: number }) => api.get<Paged<Staff>>(`/staff?${qs({ ...p, pageSize: 50 })}`),
  get: (id: number) => api.get<{ item: Staff }>(`/staff/${id}`).then((r) => r.item),
  options: () => api.get<{ items: Pick<Staff, 'id' | 'code' | 'name' | 'role' | 'salary'>[] }>('/staff/options').then((r) => r.items),
  create: (body: StaffInput) => api.post<{ item: Staff }>('/staff', body).then((r) => r.item),
  update: (id: number, body: StaffInput) => api.put<{ item: Staff }>(`/staff/${id}`, body).then((r) => r.item),
  remove: (id: number) => api.delete(`/staff/${id}`),
}

export const salaryApi = {
  list: (p: { search?: string; status?: string; staffId?: number; month?: string; from?: string; to?: string; page: number; pageSize?: number }) =>
    api.get<Paged<SalaryPayment> & { totalPaid: number }>(`/salary-payments?${qs({ pageSize: 20, ...p })}`),
  create: (body: { staffId: number; month: string; docDate: string; amount: number; mode: string; reference?: string; notes?: string }) =>
    api.post<{ item: SalaryPayment }>('/salary-payments', body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post(`/salary-payments/${id}/cancel`, { reason }),
}

export const deptLabels: Record<StaffDept, string> = { WORKSHOP: 'Workshop', SHOP: 'Shop' }

// "2026-10" → "Oct 2026"
export const monthLabel = (m: string) => new Date(`${m.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export const payrollApi = {
  sheet: (month: string) => api.get<PayrollSheet & { success: boolean }>(`/payroll?${qs({ month })}`),
  pay: (body: { staffId: number; month: string; docDate: string; bonus: number; deduction: number; deductionNote?: string; piecePaid: number; mode: string; reference?: string; notes?: string }) =>
    api.post<{ item: Payslip }>('/payroll/payslips', body).then((r) => r.item),
  cancel: (id: number, reason: string) => api.post(`/payroll/payslips/${id}/cancel`, { reason }),
  pdfPath: (id: number) => `/payroll/payslips/${id}/pdf`,
}
