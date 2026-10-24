import { splitTenders } from '../calc'
import type { Billing } from '../hooks/useBilling'
import { tenderInput } from '../tenders'

// What is still unpaid on the bill being typed: total − advance used − money received (change counted only from cash).
export function calcSaleDue(b: Pick<Billing, 'customer' | 'useAdvance' | 'advanceAvailable' | 'payable' | 'tenders'>) {
  const advanceUsed = b.customer && b.useAdvance ? Math.min(b.advanceAvailable, b.payable) : 0
  return splitTenders(tenderInput(b.tenders), Math.round((b.payable - advanceUsed) * 100) / 100).due
}
