import { orderedValues } from '@/features/workshop/api/workshop.api'
import type { BusinessProfile } from '@/lib/gst'
import type { Job } from '../types'

// Plain-text job bill + tailor slip for the dot-matrix printer (same style as the shop's "2573/2425-JOB" bill).

const money = (n: number | string) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const center = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.slice(0, w).length) / 2))) + s.slice(0, w)
const lr = (l: string, r: string, w: number) => (w - l.length - r.length >= 1 ? l + ' '.repeat(w - l.length - r.length) + r : `${l}\n${r.padStart(w)}`)
const ddmmyyyy = (d: string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-')
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

// Bill number like the shop's old bills: running number / paper book no. - JOB  (e.g. "2/2739-JOB"; no book no. → "2-JOB").
export const shortJobNo = (job: Pick<Job, 'docNo' | 'bookNo'>) => {
  const run = Number(job.docNo.split('/').pop()) || job.docNo
  return `${run}${job.bookNo ? `/${job.bookNo}` : ''}-JOB`
}

// Top of the bill, as on the shop's old bills: shop name, address, phone, title; To / NAME / phone on the left;
// Ready by under them; then No / Date on the right; a double line.
const plain = (n: number | string) => Number(n).toFixed(2) // old bills: no thousands commas
const oldDate = (d: string, withTime = false) => {
  const x = new Date(d)
  const day = x.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
  return withTime ? `${day} ${x.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })}` : day
}
function head(job: Job, p: BusinessProfile, W: number, title: string) {
  const L = [center(p.shopName.toUpperCase(), W)]
  const town = [p.city, p.pincode].filter(Boolean).join(' - ')
  const addr = [p.addressLine1, [p.addressLine2, town].filter(Boolean).join(', ')].filter(Boolean)
  for (const a of addr) L.push(...wrap(a.toUpperCase(), W).map((x) => center(x, W)))
  if (p.phone) L.push(center(`PH: ${p.phone}`, W))
  L.push('', center(title, W))
  L.push('To', job.customerName.toUpperCase(), job.customerPhone ?? '', `Ready by: ${oldDate(job.expectedDate)}`)
  const right = [`No  : ${shortJobNo(job)}`, `Date: ${oldDate(job.createdAt, true)}`]
  const rw = Math.max(...right.map((r) => r.length))
  for (const r of right) L.push(' '.repeat(Math.max(0, W - rw)) + r)
  L.push('='.repeat(W))
  return L
}

export function jobBillText(job: Job, p: BusinessProfile, cols: number) {
  const W = Math.max(40, cols)
  const rule = '-'.repeat(W)
  const gst = Number(job.cgstTotal) + Number(job.sgstTotal) + Number(job.igstTotal)
  const L = head(job, p, W, '* DESIGNING AND TAILORING *')
  const wSl = 3, wRate = 10, wQty = 11, wAmt = 11
  const wName = W - wSl - wRate - wQty - wAmt - 4
  const row = (sl: string, n: string, r: string, q: string, a: string) => `${sl.padEnd(wSl)} ${n.padEnd(wName)} ${r.padStart(wRate)} ${q.padStart(wQty)} ${a.padStart(wAmt)}`
  const qty = (n: number | string, unit = 'NOS') => `${Number(n).toFixed(3)} ${unit}`
  L.push(row('Sl#', 'Particulars', 'Rate', 'Qty', 'Amount'), rule)
  const lines = [
    ...job.items.map((i) => ({ n: i.description, r: Number(i.chargeRate), q: qty(i.qty), a: i.qty * Number(i.chargeRate) })),
    ...job.costs.filter((c) => Number(c.charge) > 0).map((c) => ({ n: c.description ? `${c.kind} ${c.description}` : c.kind, r: Number(c.charge), q: qty(1), a: Number(c.charge) })),
    // Items sold on the job (used fabric is not printed).
    ...job.materials.filter((m) => !m.included).map((m) => ({
      n: `${m.description}${Number(m.discountPct) ? ` (-${Number(m.discountPct)}%)` : ''}${Number(m.returnedQty) > 0 ? ` [${Number(m.returnedQty)} returned]` : ''}`,
      r: Number(m.rate), q: qty(m.qty, (m.variant?.product.unit.code ?? 'NOS').toUpperCase()), a: Number(m.qty) * Number(m.rate) * (1 - Number(m.discountPct) / 100),
    })),
  ]
  lines.forEach((l, i) => {
    const parts = wrap(l.n.toUpperCase(), wName)
    L.push(row(String(i + 1), parts[0] ?? '', plain(l.r), l.q, plain(l.a)))
    for (const extra of parts.slice(1)) L.push(row('', extra, '', '', ''))
  })
  L.push(rule)
  // Totals on the right, like the old bill: amount, a short line, BALANCE AMOUNT and a double line.
  const amt = (v: string, label = '') => L.push(`${label ? `${label}: ` : ''}${v.padStart(wAmt)}`.padStart(W))
  if (Number(job.discount) > 0) { amt(plain(job.chargeTotal)); amt(`-${plain(job.discount)}`, 'DISCOUNT') }
  if (Number(job.roundOff)) amt(plain(job.roundOff), 'ROUND OFF')
  amt(plain(job.grandTotal))
  L.push('-'.repeat(wAmt).padStart(W))
  if (Number(job.paidAmount) > 0) amt(plain(job.paidAmount), job.status === 'DELIVERED' ? 'PAID' : 'ADVANCE')
  if (Number(job.returnedAmount) > 0) amt(`-${plain(job.returnedAmount)}`, 'RETURNED')
  amt(plain(job.dueAmount), 'BALANCE AMOUNT')
  L.push('='.repeat(wAmt).padStart(W))
  if (gst > 0) {
    const split = job.taxMode === 'INTRA' ? `CGST ${plain(job.cgstTotal)} SGST ${plain(job.sgstTotal)}` : `IGST ${plain(job.igstTotal)}`
    L.push(...wrap(`GST included: Taxable ${plain(job.taxableTotal)} ${split}`, W))
  }
  L.push(...wrap(`Rupees ${job.amountInWords}`, W), rule)
  if (job.notes) L.push(...wrap(`Note: ${job.notes}`, W))
  if (job.status === 'CANCELLED') L.push(center('*** CANCELLED ***', W))
  // Shop terms (same lines on the PDF — backend job.pdf.ts).
  L.push(center('Please bring this bill to collect. Thank you!', W))
  for (const t of ['* Final stitching after trial only. Alterations are expected.', '* Delivery dates are tentative and may vary depending on workload or unforeseen circumstances.']) L.push(...wrap(t, W))
  return L.join('\n')
}

// For the workshop: garments, measurements and design — no prices.
export function tailorSlipText(job: Job, p: BusinessProfile, cols: number) {
  const W = Math.max(40, cols)
  const L = head(job, p, W, '* TAILOR SLIP *')
  job.items.forEach((i, n) => {
    L.push(`${n + 1}. ${i.qty} x ${i.description}${i.tailor ? `   Tailor: ${i.tailor.name}` : ''}${i.ownFabric ? '   (customer cloth)' : ''}`)
    const values = orderedValues(i.measurements, i.garmentType.fields).map(([k, v]) => `${k}: ${v}`)
    // Two or three measurements per line, in columns.
    const cell = Math.max(18, Math.floor((W - 3) / 3))
    const perLine = Math.max(1, Math.floor((W - 3) / cell))
    for (let k = 0; k < values.length; k += perLine) L.push('   ' + values.slice(k, k + perLine).map((v) => v.slice(0, cell - 1).padEnd(cell)).join('').trimEnd())
    if (i.instructions) L.push(...wrap(`Design: ${i.instructions}`, W - 3).map((x) => `   ${x}`))
    L.push('')
  })
  if (job.internalNotes) L.push(...wrap(`Note: ${job.internalNotes}`, W))
  return L.join('\n')
}

// Internal job cost sheet (same layout as the shop's paper): stitching charged vs its costs → job profit.
// Items the customer paid for are a shop sale — listed under the total with their own profit.
export function jobCostSheetText(job: Job, p: BusinessProfile, cols: number) {
  const W = Math.max(56, cols)
  const rule = '-'.repeat(W)
  const wPcs = 6, wRate = 10, wTot = 11, wCost = 11
  const wName = W - 3 - wPcs - wRate - wTot - wCost - 5
  const row = (sl: string, n: string, pcs: string, rate: string, tot: string, cost: string) =>
    `${sl.padStart(3)} ${n.slice(0, wName).padEnd(wName)} ${pcs.padStart(wPcs)} ${rate.padStart(wRate)} ${tot.padStart(wTot)} ${cost.padStart(wCost)}`
  const L = [center(p.shopName.toUpperCase(), W), center('JOB COST SHEET', W), rule]
  L.push(lr(`Job No: ${job.docNo}`, `Date: ${ddmmyyyy(new Date().toISOString())}`, W), `Customer: ${job.customerName}`, rule)
  L.push(row('Sl', 'Particulars', 'Pcs', 'Rate', 'Total', 'Cost'), rule)
  let n = 0
  const add = (name: string, pcs: number | string, rate: number, tot: number | null, cost: number | null) =>
    L.push(row(String(++n), name, String(pcs), money(rate), tot === null ? '' : money(tot), cost === null ? '' : money(cost)))
  for (const i of job.items) add(i.description, i.qty, Number(i.chargeRate), i.qty * Number(i.chargeRate), null)
  for (const c of job.costs) add(c.description ? `${c.kind} ${c.description}` : c.kind, 1, Number(c.charge), Number(c.charge), null)
  for (const i of job.items.filter((x) => x.tailor && Number(x.labourRate) > 0)) add(`Tailor fee (${i.tailor!.name})`, i.qty, Number(i.labourRate), null, i.qty * Number(i.labourRate))
  for (const e of job.costEntries) add(`${e.category.name}${e.description ? ` - ${e.description}` : ''}`, Number(e.qty), Number(e.rate), null, Number(e.amount))
  for (const m of job.materials.filter((x) => x.included)) add(`${m.description} (given free)`, Number(m.qty), Number(m.unitCost), null, Number(m.qty) * Number(m.unitCost))
  L.push(rule)
  const tot = (label: string, v: number) => L.push(`${label.padStart(W - wCost - 3)} : ${money(v).padStart(wCost)}`)
  const c = job.cost
  const stitching = job.items.reduce((s, i) => s + i.qty * Number(i.chargeRate), 0) + job.costs.reduce((s, x) => s + Number(x.charge), 0)
  tot('Stitching charged', stitching)
  if (Number(job.discount) > 0) tot('Less discount', Number(job.discount))
  if (c.chargedGst > 0) tot('Less GST', c.chargedGst)
  tot('Less total cost', c.costTotal)
  L.push(rule)
  tot('JOB PROFIT', c.profit)
  const sold = job.materials.filter((x) => !x.included)
  if (sold.length) {
    L.push(rule, 'Items sold on this bill (shop sale - not in job profit):')
    for (const m of sold) L.push(`  ${m.description} ${Number(m.qty)} x ${money(Number(m.rate))} = ${money(Number(m.amount))}`)
    L.push(`  Sold ${money(c.sold.taxable)} (before GST) - cost ${money(c.sold.cost)} = profit ${money(c.sold.profit)}`)
  }
  return L.join('\n')
}
