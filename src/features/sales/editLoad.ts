import { inventoryApi } from '@/features/inventory/api/inventory.api'
import { customerApi, salesApi } from './api/sales.api'
import type { BillMeta } from './components/BillPaymentPanel'
import type { SaleLineDraft } from './components/SaleLineRow'
import type { Customer } from './types'

// "Edit bill": a saved shop bill loaded back into the billing screen. The bill-level discount is what is left after
// the line discounts (the bill keeps one total discount).

const r2 = (n: number) => Math.round(n * 100) / 100
export type EditInfo = { id: number; docNo: string; paid: number }

export async function loadSaleForEdit(id: number): Promise<{ edit: EditInfo; lines: SaleLineDraft[]; customer: Customer | null; meta: BillMeta }> {
  const sale = await salesApi.get(id)
  const ids = [...new Set(sale.lines.map((l) => l.variantId))]
  const items = new Map((await Promise.all(ids.map((v) => inventoryApi.ledger(v, 1)))).map((r) => [r.item.id, r.item]))
  const customer = sale.customerId ? await customerApi.get(sale.customerId) : null
  const lines: SaleLineDraft[] = sale.lines.map((l, i) => ({
    key: `e${id}-${i}`, item: items.get(l.variantId)!, qty: String(Number(l.qty)), rate: String(Number(l.rate)),
    discountPct: Number(l.discountPct) ? String(Number(l.discountPct)) : '',
  }))
  const afterLines = sale.lines.reduce((s, l) => s + Number(l.qty) * Number(l.rate) * (1 - Number(l.discountPct) / 100), 0)
  const billDiscount = r2(afterLines - sale.lines.reduce((s, l) => s + Number(l.amount), 0))
  const meta: BillMeta = {
    walkInName: customer ? '' : sale.customerName === 'Cash customer' ? '' : sale.customerName, walkInPhone: customer ? '' : sale.customerPhone ?? '',
    billDiscount: billDiscount > 0.004 ? String(billDiscount) : '', notes: sale.notes ?? '', docDate: sale.docDate.slice(0, 10), bookNo: sale.bookNo ?? '',
  }
  return { edit: { id, docNo: sale.docNo, paid: Number(sale.paidAmount) }, lines, customer, meta }
}
