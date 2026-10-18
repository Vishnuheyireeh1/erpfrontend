import { api } from '@/lib/api'
import type { CashTally, DayBook, Expense, ExpenseCategory, MoveKind, Movement, Paged, PaymentMode, ProfitLoss } from '../types'

function qs(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== false && q.set(k, String(v)))
  return q.toString()
}
type ListFilters = { search?: string; status?: string; categoryId?: number; kind?: string; expenseKind?: string; from?: string; to?: string; page: number }

export const financeApi = {
  addExpense: (body: { docDate: string; categoryId: number; amount: number; mode: PaymentMode; paidTo?: string; reference?: string; notes?: string }) =>
    api.post<{ item: Expense }>('/expenses', body).then((r) => r.item),
  cancelExpense: (id: number, reason: string) => api.post(`/expenses/${id}/cancel`, { reason }),

  categories: () => api.get<{ items: ExpenseCategory[] }>('/expense-categories').then((r) => r.items),
  saveCategory: (id: number | null, body: unknown) => (id ? api.put(`/expense-categories/${id}`, body) : api.post('/expense-categories', body)),
  removeCategory: (id: number) => api.delete(`/expense-categories/${id}`),

  movements: (p: ListFilters) => api.get<Paged<Movement>>(`/money-movements?${qs({ ...p, pageSize: 20 })}`),
  addMovement: (body: { docDate: string; kind: MoveKind; amount: number; mode: PaymentMode; reference?: string; notes?: string }) =>
    api.post<{ item: Movement }>('/money-movements', body).then((r) => r.item),
  cancelMovement: (id: number, reason: string) => api.post(`/money-movements/${id}/cancel`, { reason }),

  dayBook: (from: string, to: string, order?: string) => api.get<DayBook>(`/finance/day-book?${qs({ from, to, order })}`),
  tally: (date: string) => api.get<{ date: string; expected: number; saved: CashTally | null }>(`/finance/tally?${qs({ date })}`),
  saveTally: (body: { date: string; counted: number; note?: string }) => api.post<{ date: string; expected: number; saved: CashTally | null }>('/finance/tally', body),
  tallyHistory: (order?: string) => api.get<{ items: CashTally[] }>(`/finance/tally/history?${qs({ order })}`).then((r) => r.items),
  profit: (from: string, to: string) => api.get<ProfitLoss>(`/finance/profit?${qs({ from, to })}`),
  costs: (p: { from: string; to: string; search?: string; order?: string }) => api.get<{ rows: CostRow[]; totals: { all: number; direct: number; indirect: number; assets: number } }>(`/finance/costs?${qs(p)}`),
}

export const moveKindLabels: Record<MoveKind, string> = {
  DEPOSIT: 'Cash deposited to bank',
  WITHDRAW: 'Cash withdrawn from bank',
  OWNER_IN: 'Owner put money in',
  OWNER_OUT: 'Owner took money',
  OTHER_INCOME: 'Other income',
}

// Day book line types in plain words, and where each opens.
export const dayBookKinds: Record<string, { label: string; link?: (id: number) => string }> = {
  RECEIPT: { label: 'Money received', link: (id) => `/sales/receipts/${id}` },
  REFUND: { label: 'Refund to customer', link: (id) => `/sales/returns/${id}` },
  BRAND_PAYMENT: { label: 'Money from brand', link: (id) => `/brands/${id}` },
  SUPPLIER_PAYMENT: { label: 'Paid to supplier', link: (id) => `/purchase/payments/${id}` },
  FREIGHT: { label: 'Freight paid (lorry)', link: (id) => `/purchase/${id}` },
  JOURNAL: { label: 'Journal entry (accounts)', link: () => '/accounts?tab=journal' },
  TAILOR_PAYMENT: { label: 'Paid to tailor' },
  JOB_COST: { label: 'Job cost paid', link: (id) => `/jobs/${id}` },
  SALARY: { label: 'Salary paid' },
  FEE: { label: 'Training fee received', link: (id) => `/training/students/${id}` },
  PRODUCTION_COST: { label: 'Production cost paid', link: (id) => `/production/${id}` },
  EXPENSE: { label: 'Expense' },
  ASSET_BOUGHT: { label: 'Asset bought (AC, machine …)', link: () => '/expenses' },
  ...Object.fromEntries(Object.entries(moveKindLabels).map(([k, v]) => [k, { label: v }])),
}

// Expenses page: one cost of the period — typed expense or automatic (salary, worker pay, job cost, cloth used, stock adjustment).
export type CostKind = 'DIRECT' | 'INDIRECT' | 'ASSET'
export type CostRow = {
  key: string
  source: 'EXPENSE' | 'SALARY' | 'WORKER_PAY' | 'BRAND_PAY' | 'BRAND_CLOTH' | 'JOB_COST' | 'MATERIAL' | 'ADJUST'
  refId: number
  date: string
  docNo: string
  what: string
  detail: string | null
  kind: CostKind
  mode: string | null
  amount: number
  cancelled: boolean
}
