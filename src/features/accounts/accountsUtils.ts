import { useState } from 'react'
import type { DateRangeValue } from '@/components/ui/DateRange'
import { todayISO } from '@/features/inventory/constants'
import { formatINR2 } from '@/lib/format'
import type { AccountKind } from './types'

// Indian financial year starts 1 April: "2026-10-11" → "2026-04-01".
export function fyStart(day = todayISO()) {
  const y = Number(day.slice(0, 4))
  return `${Number(day.slice(5, 7)) >= 4 ? y : y - 1}-04-01`
}

// Accounts pages default to "this financial year so far".
export function useYearRange() {
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: fyStart(), to: todayISO() }))
  return { range, setRange, from: range.from || fyStart(range.to || todayISO()), to: range.to || todayISO() }
}

// + = debit, − = credit → "₹1,200.00 Dr" / "₹500.00 Cr".
export const drCr = (v: number) => (Math.abs(v) < 0.005 ? '—' : `${formatINR2(Math.abs(v))} ${v > 0 ? 'Dr' : 'Cr'}`)
export const money = (v: number) => (Math.abs(v) < 0.005 ? '—' : formatINR2(v))

export const kindLabel: Record<AccountKind, string> = {
  ASSET: 'What the shop owns (assets)',
  LIABILITY: 'What the shop owes (liabilities)',
  EQUITY: 'Net worth (capital)',
  INCOME: 'Income',
  DIRECT_EXPENSE: 'Direct costs',
  INDIRECT_EXPENSE: 'Shop expenses (indirect)',
}
export const kindOptions = (Object.keys(kindLabel) as AccountKind[]).map((k) => ({ value: k, label: kindLabel[k] }))

// Where a ledger line came from, and the page that shows that document.
const SRC: Record<string, { label: string; link?: (id: number) => string }> = {
  INV: { label: 'Sales bill', link: (id) => `/sales/${id}` },
  SR: { label: 'Sales return', link: (id) => `/sales/returns/${id}` },
  SRF: { label: 'Refund', link: (id) => `/sales/returns/${id}` },
  RCP: { label: 'Money received', link: (id) => `/sales/receipts/${id}` },
  JOB: { label: 'Stitching job', link: (id) => `/jobs/${id}` },
  JOBI: { label: 'Items on job', link: (id) => `/jobs/${id}` },
  JC: { label: 'Job cost', link: (id) => `/jobs/${id}` },
  TE: { label: 'Tailor pay earned', link: (id) => `/jobs/${id}` },
  TP: { label: 'Tailor payment' },
  BRO: { label: 'Brand order', link: (id) => `/brand-orders/${id}` },
  BD: { label: 'Brand delivery bill', link: (id) => `/brand-bills/${id}` },
  BRP: { label: 'Money from brand' },
  OPENB: { label: 'Opening balance' },
  PUR: { label: 'Purchase bill', link: (id) => `/purchase/${id}` },
  PAY: { label: 'Supplier payment', link: (id) => `/purchase/payments/${id}` },
  DN: { label: 'Purchase return', link: (id) => `/purchase/returns/${id}` },
  PRD: { label: 'Made in the shop', link: (id) => `/production/${id}` },
  OPN: { label: 'Opening stock', link: (id) => `/stock/documents/${id}` },
  ADJ: { label: 'Stock adjustment', link: (id) => `/stock/documents/${id}` },
  FEE: { label: 'Training fee' },
  SAL: { label: 'Salary paid' },
  SALM: { label: 'Salary for the month' },
  EXP: { label: 'Expense' },
  MOV: { label: 'Cash / bank movement' },
  JV: { label: 'Journal entry' },
  OPEN: { label: 'Opening balance' }, OPENC: { label: 'Opening balance' }, OPENS: { label: 'Opening balance' }, OPENT: { label: 'Opening balance' },
  STKFIX: { label: 'Stock value check' },
}
export const srcLabel = (src: string) => SRC[src]?.label ?? src
export const srcLink = (src: string, id: number) => SRC[src]?.link?.(id)
