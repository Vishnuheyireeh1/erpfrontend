// Live preview of the sales-bill maths — a copy of backend services/sales/sales.calc.ts.
// Selling prices INCLUDE GST; the server recalculates everything on save.

export type SaleCalcLine = { qty: number; rate: number; discountPct: number; productGstRate: number; hsnCode: string | null }
type Input = { lines: SaleCalcLine[]; billDiscount: number; taxMode: 'INTRA' | 'INTER'; gstRegistered: boolean; apparelRule: boolean }

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const APPAREL_LIMIT = 2500
const isApparel = (hsn: string | null) => !!hsn && (hsn.startsWith('61') || hsn.startsWith('62'))

function gstRateFor(l: SaleCalcLine, amount: number, input: Input) {
  if (!input.gstRegistered) return 0
  if (input.apparelRule && isApparel(l.hsnCode) && l.qty > 0) return amount / l.qty / 1.05 <= APPAREL_LIMIT ? 5 : 18
  return l.productGstRate
}

export function calcSale(input: Input) {
  const afterLine = input.lines.map((l) => r2(l.qty * l.rate * (1 - l.discountPct / 100)))
  const sumAfterLine = r2(afterLine.reduce((s, a) => s + a, 0))
  const billDiscount = Math.min(r2(input.billDiscount), sumAfterLine)
  let spread = 0
  const amounts = afterLine.map((a, i) => {
    if (i === afterLine.length - 1) return r2(a - (billDiscount - spread))
    const share = sumAfterLine > 0 ? r2((billDiscount * a) / sumAfterLine) : 0
    spread = r2(spread + share)
    return r2(a - share)
  })
  const lines = input.lines.map((l, i) => {
    const amount = amounts[i]
    const gstRate = gstRateFor(l, amount, input)
    const taxable = r2((amount * 100) / (100 + gstRate))
    const tax = r2(amount - taxable)
    const cgst = input.taxMode === 'INTRA' ? r2(tax / 2) : 0
    return { amount, gstRate, taxable, cgst, sgst: input.taxMode === 'INTRA' ? r2(tax - cgst) : 0, igst: input.taxMode === 'INTER' ? tax : 0 }
  })
  const grossTotal = r2(input.lines.reduce((s, l) => s + l.qty * l.rate, 0))
  const net = r2(lines.reduce((s, l) => s + l.amount, 0))
  const grandTotal = Math.round(net)
  return {
    lines,
    grossTotal,
    discountTotal: r2(grossTotal - net),
    taxableTotal: r2(lines.reduce((s, l) => s + l.taxable, 0)),
    cgstTotal: r2(lines.reduce((s, l) => s + l.cgst, 0)),
    sgstTotal: r2(lines.reduce((s, l) => s + l.sgst, 0)),
    igstTotal: r2(lines.reduce((s, l) => s + l.igst, 0)),
    roundOff: r2(grandTotal - net),
    grandTotal,
  }
}

// Cash is the only tender that can give change; UPI / card can't exceed the bill.
export function splitTenders(tenders: { mode: string; amount: number }[], grand: number) {
  const nonCash = r2(tenders.filter((t) => t.mode !== 'CASH').reduce((s, t) => s + t.amount, 0))
  const cash = r2(tenders.filter((t) => t.mode === 'CASH').reduce((s, t) => s + t.amount, 0))
  const paid = r2(nonCash + cash)
  const change = cash > 0 ? Math.max(0, Math.min(cash, r2(paid - grand))) : 0
  return { paid, nonCash, cash, change, applied: r2(paid - change), due: Math.max(0, r2(grand - paid + change)) }
}
