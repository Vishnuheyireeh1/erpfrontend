import type { BusinessProfile } from '@/lib/gst'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import type { FeeReceiptFull } from '../types'

// Fee receipt for the dot-matrix printer (same style as the shop bill, no GST lines).

const money = (n: number | string) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const center = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.slice(0, w).length) / 2))) + s.slice(0, w)
const lr = (left: string, right: string, w: number) => {
  const space = w - left.length - right.length
  return space >= 1 ? left + ' '.repeat(space) + right : `${left}\n${right.padStart(w)}`
}
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

export function feeReceiptText(r: FeeReceiptFull, p: BusinessProfile, cols: number) {
  const W = Math.min(cols, 64)
  const rule = '-'.repeat(W)
  const L: string[] = []
  L.push(center(p.shopName.toUpperCase(), W))
  for (const a of [p.addressLine1, p.addressLine2, [p.city, p.pincode].filter(Boolean).join(' - ')].filter(Boolean)) L.push(center(a, W))
  if (p.phone) L.push(center(`Ph: ${p.phone}`, W))
  L.push(center('* TRAINING FEE RECEIPT *', W), rule)
  L.push(lr(`No: ${r.docNo}`, `Date: ${day(r.docDate)}`, W))
  L.push(`Student : ${r.enrolment.student.code} ${r.enrolment.student.name}`.slice(0, W))
  L.push(`Course  : ${r.enrolment.batch.course.name}`.slice(0, W))
  L.push(`Batch   : ${r.enrolment.batch.name}`.slice(0, W), rule)
  L.push(lr('Fee received', money(r.amount), W))
  L.push(`Paid by : ${paymentModeLabels[r.mode]}${r.reference ? ` (${r.reference})` : ''}`.slice(0, W))
  if (r.balance) {
    L.push(rule, lr('Course fee', money(r.balance.fee), W), lr('Paid so far', money(r.balance.paid), W), lr('BALANCE DUE', money(r.balance.due), W))
  }
  L.push(rule)
  if (r.status === 'CANCELLED') L.push(center('*** CANCELLED ***', W))
  L.push('', lr('', 'Signature', W), '')
  return L.join('\n')
}
