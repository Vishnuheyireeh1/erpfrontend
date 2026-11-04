import type { BusinessProfile } from '@/lib/gst'
import type { BrandMaterial, BrandOrder, BrandPiece } from '../types'

// Brand order bill, printed when the order is taken: ONE bill per customer of the brand ("To PRIYA / C/o SANISH"):
// stitching fee of each piece, its additional charges, the items charged on it, and the total. No money moves or GST here — the brand is
// billed on delivery.

const center = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.slice(0, w).length) / 2))) + s.slice(0, w)
const plain = (n: number) => n.toFixed(2)
const oldDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

function oneBill(order: BrandOrder, customer: string, pieces: BrandPiece[], materials: BrandMaterial[], p: BusinessProfile, W: number) {
  const rule = '-'.repeat(W)
  const L = [center(p.shopName.toUpperCase(), W)]
  const town = [p.city, p.pincode].filter(Boolean).join(' - ')
  for (const a of [p.addressLine1, [p.addressLine2, town].filter(Boolean).join(', ')].filter(Boolean)) L.push(center(a.toUpperCase(), W))
  if (p.phone) L.push(center(`PH: ${p.phone}`, W))
  L.push('', center('* BRAND ORDER BILL *', W))
  if (customer) L.push(`To  : ${customer.toUpperCase()}`, `C/o : ${order.brandName.toUpperCase()}`)
  else L.push(`To  : ${order.brandName.toUpperCase()}`)
  L.push(`Order: ${order.docNo}${order.theirOrderNo ? `  Their no: ${order.theirOrderNo}` : ''}`, `Date : ${oldDate(order.docDate)}`, `Expected delivery: ${oldDate(order.expectedDate)}`, '='.repeat(W))

  const wAmt = 11
  const wName = W - wAmt - 1
  const row = (n: string, a: string) => `${n.slice(0, wName).padEnd(wName)} ${a.padStart(wAmt)}`
  L.push(row('Particulars', 'Amount'), rule)
  let total = 0
  for (const i of pieces) {
    const fee = Number(i.chargeRate) * i.qty
    total += fee
    L.push(`STITCHING FEE - ${i.description}`.toUpperCase().slice(0, W), row(`  ${i.qty} X ${plain(Number(i.chargeRate))}`, plain(fee)))
    for (const c of i.charges ?? []) {
      total += Number(c.amount)
      L.push(c.name.toUpperCase().slice(0, W), row(`  ${Number(c.qty)} X ${plain(Number(c.rate))}`, plain(Number(c.amount))))
    }
    for (const m of materials.filter((x) => x.itemId === i.id && x.charged)) {
      total += Number(m.amount)
      const disc = Number(m.discountPct) ? ` - ${Number(m.discountPct)}%` : ''
      L.push(m.description.toUpperCase().slice(0, W), row(`  ${Number(m.qty)} ${m.variant.product.unit.code.toUpperCase()} X ${plain(Number(m.rate))}${disc}`, plain(Number(m.amount))))
    }
  }
  L.push(rule, `TOTAL: ${plain(total).padStart(wAmt)}`.padStart(W), '='.repeat(wAmt).padStart(W), '', `${'Customer signature'.padEnd(Math.floor(W / 2))}${'For ' + p.shopName}`.slice(0, W))
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
