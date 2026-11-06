import type { BusinessProfile } from '@/lib/gst'
import { amountInWords } from '@/lib/amountWords'
import type { BrandMaterial, BrandOrder, BrandPiece } from '../types'

// Brand order bill, printed when the order is taken — same look as the shop's normal job bill. ONE bill per customer of
// the brand ("To PRIYA / C/o SANISH"): each piece, its additional charges, the items charged on it, and the total.
// No money moves or GST here — the brand is billed on delivery.

const center = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.slice(0, w).length) / 2))) + s.slice(0, w)
const plain = (n: number) => n.toFixed(2)
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

function oneBill(order: BrandOrder, customer: string, pieces: BrandPiece[], materials: BrandMaterial[], p: BusinessProfile, W: number) {
  const rule = '-'.repeat(W)
  const L = [center(p.shopName.toUpperCase(), W)]
  const town = [p.city, p.pincode].filter(Boolean).join(' - ')
  for (const a of [p.addressLine1, [p.addressLine2, town].filter(Boolean).join(', ')].filter(Boolean)) L.push(...wrap(a.toUpperCase(), W).map((x) => center(x, W)))
  if (p.phone) L.push(center(`PH: ${p.phone}`, W))
  L.push('', center('* DESIGNING AND TAILORING *', W))
  L.push('To', (customer || order.brandName).toUpperCase())
  if (customer) L.push(`C/o ${order.brandName.toUpperCase()}`)
  L.push(`Expected delivery: ${oldDate(order.expectedDate)}`)
  const right = [`No  : ${order.docNo}`, ...(order.theirOrderNo ? [`Order/Bill no: ${order.theirOrderNo}`] : []), `Date: ${oldDate(order.docDate)}`]
  const rw = Math.max(...right.map((r) => r.length))
  for (const r of right) L.push(' '.repeat(Math.max(0, W - rw)) + r)
  L.push('='.repeat(W))

  const wSl = 3, wRate = 10, wQty = 11, wAmt = 11
  const wName = W - wSl - wRate - wQty - wAmt - 4
  const row = (sl: string, n: string, r: string, q: string, a: string) => `${sl.padEnd(wSl)} ${n.padEnd(wName)} ${r.padStart(wRate)} ${q.padStart(wQty)} ${a.padStart(wAmt)}`
  const qty = (n: number, unit = 'NOS') => `${n.toFixed(3)} ${unit}`
  const lines = pieces.flatMap((i) => [
    { n: i.description, r: Number(i.chargeRate), q: qty(i.qty), a: i.qty * Number(i.chargeRate) },
    ...(i.charges ?? []).map((c) => ({ n: c.name, r: Number(c.rate), q: qty(Number(c.qty)), a: Number(c.amount) })),
    ...materials.filter((m) => m.itemId === i.id && m.charged).map((m) => ({
      n: `${m.description}${Number(m.discountPct) ? ` (-${Number(m.discountPct)}%)` : ''}`,
      r: Number(m.rate), q: qty(Number(m.qty), m.variant.product.unit.code.toUpperCase()), a: Number(m.amount),
    })),
  ])
  L.push(row('Sl#', 'Particulars', 'Rate', 'Qty', 'Amount'), rule)
  lines.forEach((l, k) => {
    const parts = wrap(l.n.toUpperCase(), wName)
    L.push(row(String(k + 1), parts[0] ?? '', plain(l.r), l.q, plain(l.a)))
    for (const extra of parts.slice(1)) L.push(row('', extra, '', '', ''))
  })
  const total = Math.round(lines.reduce((s, l) => s + l.a, 0) * 100) / 100
  L.push(rule, `TOTAL AMOUNT: ${plain(total).padStart(wAmt)}`.padStart(W), '='.repeat(wAmt).padStart(W))
  L.push(...wrap(`Rupees ${amountInWords(total)}`, W), rule)
  if (order.status === 'CANCELLED') L.push(center('*** CANCELLED ***', W))
  // Shop terms (same lines as the job bill).
  L.push(center('Please bring this bill to collect. Thank you!', W))
  for (const t of ['* Final stitching after trial only. Alterations are expected.', '* Delivery dates are tentative and may vary depending on workload or unforeseen circumstances.']) L.push(...wrap(t, W))
  return L.join('\n')
}

// All the bills of an order, one after the other, with a cut line between them.
export function brandOrderBillText(order: BrandOrder, p: BusinessProfile, cols: number) {
  const W = Math.max(40, cols)
  const groups = new Map<string, { name: string; pieces: BrandPiece[] }>()
  for (const i of order.items) {
    const name = i.endCustomer?.trim() ?? ''
    const key = name.toLowerCase()
    const g = groups.get(key)
    if (g) g.pieces.push(i)
    else groups.set(key, { name, pieces: [i] })
  }
  return [...groups.values()].map((g) => oneBill(order, g.name, g.pieces, order.materials, p, W)).join(`\n\n${center('- - - cut here - - -', W)}\n\n`)
}
