import type { Tone } from '@/components/ui/Badge'
import type { JobStatus } from './types'

// Labels, colours and maths shared by the stitching-job screens.

export const statusLabels: Record<JobStatus, string> = {
  PENDING: 'Booked', CUTTING: 'Cutting', STITCHING: 'Stitching', TRIAL: 'Trial / alteration', READY: 'Ready', DELIVERED: 'Handed over', CANCELLED: 'Cancelled',
}
export const statusTones: Record<JobStatus, Tone> = {
  PENDING: 'neutral', CUTTING: 'pending', STITCHING: 'pending', TRIAL: 'pending', READY: 'success', DELIVERED: 'info', CANCELLED: 'neutral',
}
// Workshop stages that can be chosen directly (Delivered / Cancelled have their own actions).
export const stages: JobStatus[] = ['PENDING', 'CUTTING', 'STITCHING', 'TRIAL', 'READY']
export const chargeKinds = ['Embroidery', 'Lining', 'Lace / border', 'Hand work', 'Buttons / zip', 'Other']

export const isOpen = (s: JobStatus) => s !== 'DELIVERED' && s !== 'CANCELLED'

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Preview of backend services/jobs/job.calc.ts (the server recalculates on save).
// Discount and the job GST apply to the stitching part; sold items carry their own GST (counter rules).
export function calcJob(input: {
  items: { qty: number; chargeRate: number; labourRate: number }[]
  itemsTotal: number // sold items, GST included
  costs: { charge: number }[]
  discount: number
  gstRate: number
}) {
  const stitchCharges = r2(input.items.reduce((s, i) => s + i.qty * i.chargeRate, 0) + input.costs.reduce((s, c) => s + c.charge, 0))
  const discount = Math.min(r2(input.discount), stitchCharges)
  const stitchNet = r2(stitchCharges - discount)
  const taxable = r2((stitchNet * 100) / (100 + input.gstRate))
  const net = r2(stitchNet + input.itemsTotal)
  const grandTotal = Math.round(net)
  return {
    chargeTotal: r2(stitchCharges + input.itemsTotal), stitchCharges, itemsTotal: input.itemsTotal,
    discount, taxable, gst: r2(stitchNet - taxable), roundOff: r2(grandTotal - net), grandTotal,
    labour: r2(input.items.reduce((s, i) => s + i.qty * i.labourRate, 0)),
  }
}

// "2 × Blouse, 1 × Churidar"
export const garmentsText = (items: { description: string; qty: number }[]) => items.map((i) => `${i.qty} × ${i.description}`).join(', ')

// Days until the promised date (negative = late).
export function daysLeft(expected: string) {
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00Z').getTime()
  return Math.round((new Date(expected).getTime() - today) / 86_400_000)
}
export function dueText(expected: string, open: boolean) {
  if (!open) return ''
  const d = daysLeft(expected)
  return d < 0 ? `${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `In ${d} days`
}
