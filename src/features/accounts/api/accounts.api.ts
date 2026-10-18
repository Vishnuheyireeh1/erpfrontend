import { api } from '@/lib/api'
import type { Paged } from '@/features/purchase/types'
import type { AccountKind, BalanceSheet, Chart, Journal, JournalInput, Ledger, LedgerAccount, Party, ProfitLoss, SalesByType, TrialBalance } from '../types'

const qs = (p: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(p).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '').map(([k, v]) => [k, String(v)])).toString()

type Range = { from?: string; to?: string }

export const accountsApi = {
  chart: () => api.get<Chart>('/accounts/chart'),
  createAccount: (body: { name: string; kind: AccountKind; notes?: string | null; isActive: boolean }) => api.post<{ item: LedgerAccount }>('/accounts/chart', body).then((r) => r.item),
  updateAccount: (id: number, body: { name: string; kind: AccountKind; notes?: string | null; isActive: boolean }) => api.put<{ item: LedgerAccount }>(`/accounts/chart/${id}`, body).then((r) => r.item),
  removeAccount: (id: number) => api.delete(`/accounts/chart/${id}`),

  trialBalance: (r: Range) => api.get<TrialBalance>(`/accounts/trial-balance?${qs(r)}`),
  profitLoss: (r: Range) => api.get<ProfitLoss>(`/accounts/profit-loss?${qs(r)}`),
  balanceSheet: (to?: string) => api.get<BalanceSheet>(`/accounts/balance-sheet?${qs({ to })}`),

  ledger: (code: string, r: Range & { party?: string }) => api.get<Ledger>(`/accounts/ledger/${encodeURIComponent(code)}?${qs(r)}`),
  parties: (code: string, to?: string) => api.get<{ items: Party[] }>(`/accounts/ledger/${encodeURIComponent(code)}/parties?${qs({ to })}`).then((r) => r.items),

  journals: (p: Range & { status?: string; page: number; order?: string }) => api.get<Paged<Journal>>(`/accounts/journals?${qs({ ...p, pageSize: 20 })}`),
  journal: (id: number) => api.get<{ item: Journal }>(`/accounts/journals/${id}`).then((r) => r.item),
  createJournal: (body: JournalInput) => api.post<{ item: Journal }>('/accounts/journals', body).then((r) => r.item),
  cancelJournal: (id: number, reason: string) => api.post(`/accounts/journals/${id}/cancel`, { reason }),

  salesByType: (r: Range & { by: 'day' | 'month' }) => api.get<SalesByType>(`/accounts/sales-by-type?${qs(r)}`),
}
