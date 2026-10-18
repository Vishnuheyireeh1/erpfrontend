import type { PaymentMode } from './types'

// Rows of the "money handed over" editor (TenderInputs).
export type TenderRow = { key: string; mode: PaymentMode; amount: string; reference: string }

let seq = 0
export const newTender = (mode: PaymentMode = 'CASH', amount = ''): TenderRow => ({ key: `t${++seq}`, mode, amount, reference: '' })
export const tenderTotal = (rows: TenderRow[]) => rows.reduce((s, t) => s + (Number(t.amount) || 0), 0)
export const tenderInput = (rows: TenderRow[]) =>
  rows.filter((t) => Number(t.amount) > 0).map((t) => ({ mode: t.mode, amount: Number(t.amount), reference: t.reference.trim() || undefined }))
