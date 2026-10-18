import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import type { Receipt } from './types'

// Paid / Part paid / Unpaid / Cancelled badge for a sales bill.
export function saleState(b: { status: string; dueAmount: number; paidAmount: string | number }) {
  if (b.status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' as const }
  if (b.dueAmount <= 0.004) return { label: 'Paid', tone: 'success' as const }
  return Number(b.paidAmount) > 0 ? { label: 'Part paid', tone: 'pending' as const } : { label: 'Unpaid', tone: 'warn' as const }
}

// "Cash + UPI"
export const tenderText = (r: Pick<Receipt, 'tenders'>) => [...new Set(r.tenders.map((t) => paymentModeLabels[t.mode]))].join(' + ')
