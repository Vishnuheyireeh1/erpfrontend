import type { ItemDraft } from '@/features/jobs/jobDrafts'
import type { BillMeta } from './components/BillPaymentPanel'
import type { SaleLineDraft } from './components/SaleLineRow'
import type { TenderRow } from './tenders'
import type { Customer } from './types'

// The bill being typed on the Billing page, kept in this browser tab while staff move to other pages
// (e.g. "Add stitching (one bill)" and back). Removed when the bill is saved / cleared, or when the
// stitching job made from it is booked. Tab closed = draft gone.

const KEY = 'sairandhri.billing.draft'

export type BillDraft = { lines: SaleLineDraft[]; customer: Customer | null; meta: BillMeta; tenders: TenderRow[]; useAdvance: boolean; stitch?: ItemDraft[]; deliveryDate?: string }

const isEmpty = (d: BillDraft) =>
  !d.lines.length && !d.stitch?.length && !d.customer && !d.meta.walkInName && !d.meta.walkInPhone && !d.meta.billDiscount && !d.meta.notes && !d.tenders.some((t) => Number(t.amount) > 0)

export function readBillDraft(): BillDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const d = raw ? (JSON.parse(raw) as BillDraft) : null
    return d && Array.isArray(d.lines) ? { ...d, lines: d.lines.map((l) => ({ ...l, focus: false })) } : null
  } catch {
    return null
  }
}

export function saveBillDraft(d: BillDraft) {
  try {
    if (isEmpty(d)) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* private mode / storage full — the bill just isn't kept */
  }
}

export function clearBillDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
