import { todayISO } from '@/features/inventory/constants'
import type { EnrolBody } from './api/training.api'
import type { PaymentMode } from './types'

// Form state for joining a batch (used when adding a student and when joining another course).
export type EnrolDraft = { batchId: string; fee: string; joinedOn: string; payNow: string; mode: PaymentMode; reference: string }
export const emptyEnrol = (): EnrolDraft => ({ batchId: '', fee: '', joinedOn: todayISO(), payNow: '', mode: 'CASH', reference: '' })

export function enrolError(d: EnrolDraft) {
  if (!d.batchId) return 'Choose the batch'
  if (d.fee === '' || Number(d.fee) < 0) return 'Enter the course fee'
  if (Number(d.payNow) > Number(d.fee)) return "Paid now can't be more than the fee"
  return null
}

export const toEnrolBody = (d: EnrolDraft): EnrolBody => ({
  batchId: Number(d.batchId),
  fee: Number(d.fee),
  joinedOn: d.joinedOn,
  firstPayment: Number(d.payNow) > 0 ? { amount: Number(d.payNow), mode: d.mode, reference: d.reference.trim() || undefined } : null,
})
