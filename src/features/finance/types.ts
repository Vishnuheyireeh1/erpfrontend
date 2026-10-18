import type { PaymentMode } from '@/features/purchase/types'

export type { Paged, PaymentMode } from '@/features/purchase/types'

export type ExpenseKind = 'INDIRECT' | 'DIRECT' | 'ASSET' // ASSET = lasts years (AC, machine) → what the shop owns
export type ExpenseCategory = { id: number; name: string; kind: ExpenseKind; sortOrder: number; isActive: boolean; used?: number }

export type Expense = {
  id: number
  docNo: string
  docDate: string
  amount: string
  mode: PaymentMode
  paidTo: string | null
  reference: string | null
  notes: string | null
  status: 'POSTED' | 'CANCELLED'
  cancelReason: string | null
  createdBy: string
  category: { id: number; name: string; kind?: ExpenseKind }
}

export type MoveKind = 'DEPOSIT' | 'WITHDRAW' | 'OWNER_IN' | 'OWNER_OUT' | 'OTHER_INCOME'
export type Movement = { id: number; docNo: string; docDate: string; kind: MoveKind; amount: string; mode: PaymentMode; reference: string | null; notes: string | null; status: 'POSTED' | 'CANCELLED'; cancelReason: string | null }

export type DayBookRow = { date: string; time: string; kind: string; refId: number; docNo: string; party: string; mode: PaymentMode; account: 'CASH' | 'BANK'; in: number; out: number }
export type AccountTotals = { opening: number; in: number; out: number; closing: number }
export type DayBook = { from: string; to: string; rows: DayBookRow[]; totals: { cash: AccountTotals; bank: AccountTotals }; byMode: { mode: PaymentMode; in: number; out: number }[] }

export type CashTally = { id: number; date: string; expected: string; counted: string; difference: string; note: string | null; createdBy: string; createdAt: string }

export type ProfitLoss = {
  from: string
  to: string
  income: { goodsSold: number; stitching: number; brands: number; training: number; otherIncome: number; total: number }
  costOfGoods: number
  direct: { name: string; amount: number }[]
  directTotal: number
  grossProfit: number
  indirect: { name: string; amount: number }[]
  indirectTotal: number
  netProfit: number
  marginPct: number
}
