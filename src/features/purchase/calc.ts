// Live bill preview. Mirrors backend/src/services/purchase/purchase.calc.ts —
// the server recalculates on save, so this is only for showing totals while typing.

export type CalcLine = { qty: number; rate: number; discountPct: number; gstRate: number }
export type BillExtras = { billDiscountPct: number; billDiscount: number; otherCharges: number; chargesGstRate: number; freightSeparate: number }

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function spread(total: number, weights: number[]) {
  const sum = weights.reduce((s, w) => s + w, 0)
  let given = 0
  return weights.map((w, i) => {
    if (i === weights.length - 1) return r2(total - given)
    const share = sum > 0 ? r2((total * w) / sum) : 0
    given = r2(given + share)
    return share
  })
}

export function calcBill(lines: CalcLine[], x: BillExtras, taxMode: 'INTRA' | 'INTER') {
  const afterLine = lines.map((l) => r2(l.qty * l.rate - (l.qty * l.rate * l.discountPct) / 100))
  const items = r2(afterLine.reduce((s, a) => s + a, 0))
  const discount = Math.min(items, r2(x.billDiscountPct ? (items * x.billDiscountPct) / 100 : x.billDiscount))
  const shares = spread(discount, afterLine)
  const rows = lines.map((l, i) => {
    const taxable = r2(afterLine[i] - shares[i])
    const tax = r2((taxable * l.gstRate) / 100)
    return { taxable, tax, total: r2(taxable + tax) }
  })
  const taxable = r2(rows.reduce((s, r) => s + r.taxable, 0))
  const other = r2(x.otherCharges)
  const chargesTax = r2((other * x.chargesGstRate) / 100)
  const halves = (t: number) => r2(t / 2)
  const cgst = taxMode === 'INTRA' ? r2(rows.reduce((s, r) => s + halves(r.tax), 0) + halves(chargesTax)) : 0
  const tax = r2(rows.reduce((s, r) => s + r.tax, 0) + chargesTax)
  const sgst = taxMode === 'INTRA' ? r2(tax - cgst) : 0
  const igst = taxMode === 'INTER' ? tax : 0
  const raw = r2(taxable + tax + other)
  const grand = Math.round(raw)
  return { rows, items, discount, taxable, cgst, sgst, igst, other, chargesTax, freight: r2(x.freightSeparate), roundOff: r2(grand - raw), grand }
}
