import type { BusinessProfile } from '@/lib/gst'
import type { Sale } from '../types'

// Plain-text bill for the dot-matrix printer (TVS MSP Star, continuous paper) — same style as the
// shop's existing bill: header, No / Date-time, Sl / Particulars / Rate / Qty / Amount, totals, words.

const money = (n: number | string) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const qty = (n: string) => String(Number(n))
const center = (s: string, w: number) => {
  const t = s.slice(0, w)
  return ' '.repeat(Math.max(0, Math.floor((w - t.length) / 2))) + t
}
const lr = (left: string, right: string, w: number) => {
  const space = w - left.length - right.length
  return space >= 1 ? left + ' '.repeat(space) + right : `${left}\n${right.padStart(w)}`
}
// Word-wrap to width w.
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

export function billText(sale: Sale, p: BusinessProfile, cols: number) {
  const W = Math.max(40, cols)
  const rule = '-'.repeat(W)
  const L: string[] = []
  L.push(center(p.shopName.toUpperCase(), W))
  for (const a of [p.addressLine1, p.addressLine2, [p.city, p.pincode].filter(Boolean).join(' - ')].filter(Boolean)) L.push(...wrap(a, W).map((x) => center(x, W)))
  if (p.phone) L.push(center(`Ph: ${p.phone}`, W))
  if (p.gstRegistered && p.gstin) L.push(center(`GSTIN: ${p.gstin}`, W))
  L.push(center(p.gstRegistered ? '* TAX INVOICE *' : '* BILL OF SUPPLY *', W))
  L.push(rule)
  const d = new Date(sale.docDate)
  const date = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
  const time = new Date(sale.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).toUpperCase()
  L.push(lr(`No: ${sale.docNo}`, `Date: ${date} ${time}`, W))
  if (sale.bookNo) L.push(`SJ No: ${sale.bookNo}`)
  L.push(...wrap(`Name: ${sale.customerName}${sale.customerPhone ? `  Ph: ${sale.customerPhone}` : ''}`, W))
  if (sale.customerGstin) L.push(`GSTIN: ${sale.customerGstin}`)
  L.push(rule)

  // Columns: Sl(3) Particulars(rest) Rate(10) Qty(7) Amount(11), single spaces between.
  const wRate = 10, wQty = 7, wAmt = 11, wSl = 3
  const wName = W - wSl - wRate - wQty - wAmt - 4
  const row = (sl: string, name: string, rate: string, q: string, amt: string) =>
    `${sl.padStart(wSl)} ${name.padEnd(wName)} ${rate.padStart(wRate)} ${q.padStart(wQty)} ${amt.padStart(wAmt)}`
  L.push(row('Sl', 'Particulars', 'Rate', 'Qty', 'Amount'))
  L.push(rule)
  // Line amount = qty × rate − line discount; the bill discount is shown once below (columns add up).
  const lineAmt = (l: Sale['lines'][number]) => Math.round(Number(l.qty) * Number(l.rate) * (1 - Number(l.discountPct) / 100) * 100) / 100
  const subtotal = sale.lines.reduce((s, l) => s + lineAmt(l), 0)
  const billDisc = Math.round((subtotal - (Number(sale.grandTotal) - Number(sale.roundOff))) * 100) / 100
  sale.lines.forEach((l, i) => {
    const disc = Number(l.discountPct) ? ` (-${Number(l.discountPct)}%)` : ''
    const parts = wrap(`${l.description}${disc}`, wName)
    L.push(row(String(i + 1), parts[0] ?? '', money(l.rate), qty(l.qty), money(lineAmt(l))))
    for (const extra of parts.slice(1)) L.push(row('', extra, '', '', ''))
  })
  L.push(rule)

  const tot = (label: string, value: string) => L.push(`${label.padStart(W - wAmt - 3)} : ${value.padStart(wAmt)}`.slice(-W))
  if (billDisc > 0.004) { tot('Sub total', money(subtotal)); tot('Discount', `-${money(billDisc)}`) }
  if (Number(sale.roundOff)) tot('Round off', money(sale.roundOff))
  tot('TOTAL', money(sale.grandTotal))
  tot('Paid', money(sale.paidAmount))
  if (Number(sale.returnedAmount) > 0) tot('Returned', money(sale.returnedAmount))
  tot('Balance', money(sale.dueAmount))
  L.push(rule)

  if (p.gstRegistered) {
    const byRate = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>()
    for (const l of sale.lines) {
      const r = byRate.get(Number(l.gstRate)) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
      r.taxable += Number(l.taxable); r.cgst += Number(l.cgst); r.sgst += Number(l.sgst); r.igst += Number(l.igst)
      byRate.set(Number(l.gstRate), r)
    }
    for (const [rate, r] of byRate) {
      const split = sale.taxMode === 'INTRA' ? `CGST ${money(r.cgst)} SGST ${money(r.sgst)}` : `IGST ${money(r.igst)}`
      L.push(...wrap(`GST ${rate}%: Taxable ${money(r.taxable)} ${split}`, W))
    }
    L.push(rule)
  }
  L.push(...wrap(`Rupees ${sale.amountInWords}`, W))
  if (sale.status === 'CANCELLED') L.push(center('*** CANCELLED ***', W))
  L.push('')
  L.push(center('Thank you! Visit again.', W))
  return L.join('\n')
}
