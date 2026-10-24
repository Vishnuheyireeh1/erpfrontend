import type { NewJob } from '@/features/jobs/api/jobs.api'
import { calcJob } from '@/features/jobs/jobUtils'
import { toJobInput, toProductInput, type CostDraft, type ItemDraft } from '@/features/jobs/jobDrafts'
import { calcSale } from './calc'
import type { SaleLineDraft } from './components/SaleLineRow'
import { tenderInput, type TenderRow } from './tenders'

// Billing page with stitching garments → one stitching job bill (JOB/…): garments + the items on the bill
// ("Sold to customer" = billed, paid now; "Used for stitching" = shop material, not billed).

const num = (v: string) => Number(v) || 0

// Totals preview: sold items (counter GST rules, own line discounts) + stitching (discount and job GST apply here).
export function jobBillTotals(input: { lines: SaleLineDraft[]; stitch: ItemDraft[]; charges: CostDraft[]; discount: string; gstRate: number; apparelRule: boolean; taxMode: 'INTRA' | 'INTER'; gstRegistered: boolean }) {
  const sold = input.lines.filter((l) => !l.included)
  const items = calcSale({
    lines: sold.map((l) => ({ qty: num(l.qty), rate: num(l.rate), discountPct: num(l.discountPct), productGstRate: Number(l.item.product.taxRate?.rate ?? 0), hsnCode: l.item.product.hsnCode ?? null })),
    billDiscount: 0, taxMode: input.taxMode, gstRegistered: input.gstRegistered, apparelRule: input.apparelRule,
  })
  const job = calcJob({
    items: input.stitch.map((d) => ({ qty: num(d.qty), chargeRate: num(d.chargeRate), labourRate: num(d.labourRate) })),
    itemsTotal: items.grandTotal,
    costs: input.charges.filter((c) => num(c.charge) > 0).map((c) => ({ charge: num(c.charge) })),
    discount: num(input.discount),
    gstRate: input.gstRate,
  })
  return { items, job }
}

export function jobFromBill(b: {
  customerId: number; docDate: string; deliveryDate: string; discount: string; notes: string; gstApplied: boolean; bookNo: string
  stitch: ItemDraft[]; charges: CostDraft[]; lines: SaleLineDraft[]; tenders: TenderRow[]; useAdvance: boolean
}): NewJob {
  const base = toJobInput({ expectedDate: b.deliveryDate, gstApplied: b.gstApplied, discount: b.discount, notes: b.notes, internalNotes: '', bookNo: b.bookNo }, b.stitch, b.charges)
  return {
    ...base,
    customerId: b.customerId,
    docDate: b.docDate,
    parentJobId: null,
    tenders: tenderInput(b.tenders),
    useAdvance: b.useAdvance,
    products: toProductInput(b.lines.map((l) => ({ key: l.key, item: l.item, qty: l.qty, rate: l.rate, discountPct: l.discountPct, included: !!l.included }))),
  }
}
