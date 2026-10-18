import type { Sale } from './types'

// What the "Goods returned" dialog works on: a counter bill or the items sold on a stitching job.
export type ReturnSource = {
  kind: 'INV' | 'JOB'
  id: number
  docNo: string
  customerId: number | null
  customerName: string
  dueAmount: number
  lines: { id: number; description: string; qty: string; returnedQty: string; amount: string; unit: string; sku: string }[]
}

export const saleReturnSource = (s: Sale): ReturnSource => ({
  kind: 'INV', id: s.id, docNo: s.docNo, customerId: s.customerId, customerName: s.customerName, dueAmount: s.dueAmount,
  lines: s.lines.map((l) => ({ id: l.id, description: l.description, qty: l.qty, returnedQty: l.returnedQty, amount: l.amount, unit: l.variant.product.unit.code, sku: l.variant.sku })),
})
