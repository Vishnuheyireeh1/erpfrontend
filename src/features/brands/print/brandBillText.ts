import type { BusinessProfile } from '@/lib/gst'
import type { BrandBill } from '../moneyTypes'

// Plain-text brand delivery bill for the dot-matrix printer — same look as the shop's old bills (job bill layout).

const center = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.slice(0, w).length) / 2))) + s.slice(0, w)
const plain = (n: number | string) => Number(n).toFixed(2)
const oldDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
function wrap(s: string, w: number) {
  const out: string[] = []
  let line = ''
  for (const word of s.split(/\s+/).filter(Boolean)) {
    if (!line) line = word.slice(0, w)
    else if (line.length + 1 + word.length <= w) line += ` ${word}`
    else { out.push(line); line = word.slice(0, w) }
  }
  if (line) out.push(line)
  return out
}

export function brandBillText(bill: BrandBill, p: BusinessProfile, cols: number) {
  const W = Math.max(40, cols)
  const rule = '-'.repeat(W)
  const L = [center(p.shopName.toUpperCase(), W)]
  const town = [p.city, p.pincode].filter(Boolean).join(' - ')
  for (const a of [p.addressLine1, [p.addressLine2, town].filter(Boolean).join(', ')].filter(Boolean)) L.push(...wrap(a.toUpperCase(), W).map((x) => center(x, W)))
  if (p.phone) L.push(center(`PH: ${p.phone}`, W))
  if (p.gstRegistered && p.gstin) L.push(center(`GSTIN: ${p.gstin}`, W))
  L.push('', center(Number(bill.gstRate) ? '* TAX INVOICE - STITCHING *' : '* DELIVERY BILL - STITCHING *', W))
  L.push('To', bill.brandName.toUpperCase())
  if (bill.brandGstin) L.push(`GSTIN: ${bill.brandGstin}`)
  if (bill.brand.phone) L.push(bill.brand.phone)
  L.push(`Order: ${bill.order.docNo}${bill.order.theirOrderNo ? `  Their no: ${bill.order.theirOrderNo}` : ''}`)
  const right = [`No  : ${bill.docNo}`, `Date: ${oldDate(bill.docDate)}`]
  const rw = Math.max(...right.map((r) => r.length))
  for (const r of right) L.push(' '.repeat(Math.max(0, W - rw)) + r)
  L.push('='.repeat(W))

  const wSl = 3, wRate = 10, wQty = 11, wAmt = 11
  const wName = W - wSl - wRate - wQty - wAmt - 4
  const row = (sl: string, n: string, r: string, q: string, a: string) => `${sl.padEnd(wSl)} ${n.padEnd(wName)} ${r.padStart(wRate)} ${q.padStart(wQty)} ${a.padStart(wAmt)}`
  L.push(row('Sl#', 'Particulars', 'Rate', 'Qty', 'Amount'), rule)
  let sl = 0
  for (const l of bill.lines) {
    const name = `${l.kind === 'ITEM' ? '  + ' : ''}${l.description}${l.endCustomer ? ` - ${l.endCustomer}` : ''}`.toUpperCase()
    const parts = wrap(name, wName)
    L.push(row(l.kind === 'PIECE' ? String(++sl) : '', parts[0] ?? '', plain(l.rate), `${Number(l.qty).toFixed(3)} ${l.unit.toUpperCase()}`, plain(l.amount)))
    for (const extra of parts.slice(1)) L.push(row('', extra, '', '', ''))
  }
  L.push(rule)
  const amt = (v: string, label = '') => L.push(`${label ? `${label}: ` : ''}${v.padStart(wAmt)}`.padStart(W))
  const tax = Number(bill.cgstTotal) + Number(bill.sgstTotal) + Number(bill.igstTotal)
  if (tax > 0) {
    amt(plain(bill.taxableTotal), 'TAXABLE')
    if (bill.taxMode === 'INTRA') { amt(plain(bill.cgstTotal), `CGST ${Number(bill.gstRate) / 2}%`); amt(plain(bill.sgstTotal), `SGST ${Number(bill.gstRate) / 2}%`) }
    else amt(plain(bill.igstTotal), `IGST ${Number(bill.gstRate)}%`)
  }
  if (Number(bill.roundOff)) amt(plain(bill.roundOff), 'ROUND OFF')
  L.push('-'.repeat(wAmt).padStart(W))
  amt(plain(bill.grandTotal), 'TOTAL')
  L.push('='.repeat(wAmt).padStart(W))
  if (tax > 0) L.push('(Prices include GST)')
  L.push(...wrap(`Rupees ${bill.amountInWords}`, W), rule)
  if (bill.notes) L.push(...wrap(`Note: ${bill.notes}`, W))
  if (bill.status === 'CANCELLED') L.push(center('*** CANCELLED ***', W))
  L.push(center('Received the above pieces in good condition.', W), '', `${'Receiver signature'.padEnd(Math.floor(W / 2))}${'For ' + p.shopName}`.slice(0, W))
  return L.join('\n')
}
