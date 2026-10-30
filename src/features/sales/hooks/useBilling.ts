import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { jobsApi } from '@/features/jobs/api/jobs.api'
import { itemChargeCosts, itemError, newGarmentCharges, type CostDraft, type ItemDraft } from '@/features/jobs/jobDrafts'
import { garmentApi } from '@/features/workshop/api/workshop.api'
import { jobBillText } from '@/features/jobs/print/jobText'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { ApiError } from '@/lib/api'
import { taxModeFor } from '@/lib/gst'
import { useApiQuery } from '@/lib/useApiQuery'
import { customerApi, salesApi } from '../api/sales.api'
import { clearBillDraft, readBillDraft, saveBillDraft } from '../billDraft'
import { loadSaleForEdit, type EditInfo } from '../editLoad'
import { calcSale } from '../calc'
import type { BillMeta } from '../components/BillPaymentPanel'
import type { SaleLineDraft } from '../components/SaleLineRow'
import { ensureCustomer, quickCustomerError } from '../customerQuick'
import { jobBillTotals, jobFromBill } from '../jobBill'
import { billText } from '../print/billText'
import { printText } from '../print/printing'
import { newTender, tenderInput, type TenderRow } from '../tenders'
import type { Customer } from '../types'
import { startQty, unitWord } from '../units'

// Everything a bill needs, shared by both billing screens (step-by-step and Fast bill):
// the draft (kept in this tab), live totals, the customer rule, and saving a shop bill or booking a stitching job.

let seq = 0
const PRINT_KEY = 'sairandhri.billing.autoPrint'
const readAutoPrint = () => {
  try { return localStorage.getItem(PRINT_KEY) !== '0' } catch { return true }
}
export const lineError = (l: SaleLineDraft) => {
  const q = Number(l.qty)
  if (!(q > 0)) return l.item.product.unit.allowDecimal ? `Enter the ${unitWord(l.item.product.unit.code).toLowerCase()}` : 'Enter a quantity above 0'
  if (!l.item.product.unit.allowDecimal && !Number.isInteger(q)) return `Whole ${l.item.product.unit.code} only`
  if (l.rate === '' || Number(l.rate) < 0) return 'Enter the rate'
  return undefined
}
export const inDays = (n: number) => new Date(Date.parse(`${todayISO()}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const freshMeta = (): BillMeta => ({ walkInName: '', walkInPhone: '', billDiscount: '', notes: '', docDate: todayISO(), bookNo: '' })

export function useBilling() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, settings } = useBusinessProfile()
  const [draft] = useState(readBillDraft)
  const [lines, setLines] = useState<SaleLineDraft[]>(() => draft?.lines ?? [])
  const [customer, setCustomer] = useState<Customer | null>(() => draft?.customer ?? null)
  const [meta, setMetaState] = useState<BillMeta>(() => draft?.meta ?? freshMeta())
  const [tenders, setTenders] = useState<TenderRow[]>(() => (draft?.tenders?.length ? draft.tenders : [newTender()]))
  const [autoPrint, setAutoPrint] = useState(readAutoPrint)
  const [useAdvance, setUseAdvance] = useState(() => draft?.useAdvance ?? true)
  const [stitch, setStitch] = useState<ItemDraft[]>(() => draft?.stitch ?? [])
  const [charges, setCharges] = useState<CostDraft[]>(() => draft?.charges ?? []) // additional charges on a job bill
  const [deliveryDate, setDeliveryDate] = useState(() => draft?.deliveryDate ?? inDays(7))
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // /billing?edit=12 → that saved shop bill is loaded; saving keeps its number.
  const [editing, setEditing] = useState<EditInfo | null>(null)
  const isJob = stitch.length > 0 // a garment to stitch on the bill → it is booked as a stitching job
  useEffect(() => saveBillDraft({ lines, customer, meta, tenders, useAdvance, stitch, charges, deliveryDate }), [lines, customer, meta, tenders, useAdvance, stitch, charges, deliveryDate])
  const told = useRef(false)
  useEffect(() => {
    if (told.current || !(draft?.lines.length || draft?.stitch?.length || draft?.customer)) return
    told.current = true
    toast.success('Your unsaved bill is back — continue or press Clear')
  }, [draft, toast])
  const advance = useApiQuery(['advance', customer?.id], () => (customer ? customerApi.advance(customer.id) : Promise.resolve(null)))
  const advanceAvailable = advance.data?.total ?? 0

  // /billing?customer=12 (from the customer page) → that customer is chosen once loaded.
  const [params, setParams] = useSearchParams()
  const editId = Number(params.get('edit')) || 0
  useEffect(() => {
    if (!editId || editing?.id === editId) return
    loadSaleForEdit(editId)
      .then((r) => { setEditing(r.edit); setLines(r.lines); setCustomer(r.customer); setMetaState(r.meta); setStitch([]); setCharges([]); setTenders([newTender()]); setUseAdvance(false) })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not open the bill'))
  }, [editId, editing?.id, toast])
  const presetId = Number(params.get('customer')) || 0
  const preset = useApiQuery(['bill-customer', presetId], () => (presetId ? customerApi.get(presetId) : Promise.resolve(null)))
  const [presetDone, setPresetDone] = useState(false)
  if (!presetDone && preset.data) {
    setPresetDone(true)
    setCustomer(preset.data)
  }

  const gstRegistered = profile?.gstRegistered ?? false
  const taxMode = taxModeFor(profile?.stateCode ?? '32', customer?.stateCode) as 'INTRA' | 'INTER'
  const apparelRule = settings?.['billing.apparelGstRule'] ?? true
  const totals = useMemo(
    () => calcSale({
      lines: lines.map((l) => ({ qty: Number(l.qty) || 0, rate: Number(l.rate) || 0, discountPct: Number(l.discountPct) || 0, productGstRate: Number(l.item.product.taxRate?.rate ?? 0), hsnCode: l.item.product.hsnCode ?? null })),
      billDiscount: Number(meta.billDiscount) || 0, taxMode, gstRegistered, apparelRule,
    }),
    [lines, meta.billDiscount, taxMode, gstRegistered, apparelRule],
  )
  // With stitching: job GST as set in Settings → Stitching jobs; bill discount = stitching discount.
  const jobGst = !!settings?.['jobs.gst'].defaultOn && gstRegistered
  const jobGstRate = jobGst ? settings?.['jobs.gst'].rate ?? 0 : 0
  // Charges typed inside each garment (Lining (Blouse) …) + any bill-level ones (Fast bill page).
  const allCharges = useMemo(() => [...itemChargeCosts(stitch), ...charges], [stitch, charges])
  const jobT = useMemo(
    () => jobBillTotals({ lines, stitch, charges: allCharges, discount: meta.billDiscount, gstRate: jobGstRate, apparelRule, taxMode, gstRegistered }),
    [lines, stitch, allCharges, meta.billDiscount, jobGstRate, apparelRule, taxMode, gstRegistered],
  )
  const soldIndex = new Map(lines.filter((l) => !l.included).map((l, i) => [l.key, i]))
  const lineCalc = (l: SaleLineDraft, i: number) => (isJob ? jobT.items.lines[soldIndex.get(l.key) ?? -1] : totals.lines[i])
  const grandTotal = isJob ? jobT.job.grandTotal : totals.grandTotal
  // What is left to take now (an edited bill keeps what was already paid on it).
  const payable = editing ? Math.max(0, Math.round((grandTotal - editing.paid) * 100) / 100) : grandTotal

  const setMeta = (patch: Partial<BillMeta>) => setMetaState((m) => ({ ...m, ...patch }))
  // Scanning the same item again adds 1 (metre items: jump to that line to type the amount).
  const addItem = (item: StockItem) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id)
      if (existing) return ls.map((l) => (l === existing ? (item.product.unit.allowDecimal ? { ...l, focus: true } : { ...l, qty: String((Number(l.qty) || 0) + 1) }) : { ...l, focus: false }))
      const fresh = { key: `s${++seq}`, item, qty: startQty(item.product.unit.allowDecimal), rate: String(Number(item.sellingPrice)), discountPct: '', focus: item.product.unit.allowDecimal }
      return [...ls.map((l) => ({ ...l, focus: false })), fresh]
    })
  const changeLine = (key: string, patch: Partial<SaleLineDraft>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key: string) => setLines((ls) => ls.filter((x) => x.key !== key))
  const toggleAutoPrint = (v: boolean) => {
    setAutoPrint(v)
    try { localStorage.setItem(PRINT_KEY, v ? '1' : '0') } catch { /* private mode — keep in memory only */ }
  }

  // Nobody picked → the typed name (+ phone) becomes a customer (same phone = same customer). Shop bill with both
  // empty → walk-in (paid in full). Stitching, or a shop bill on credit, needs name + phone.
  const typedSomeone = meta.walkInName.trim() !== '' || meta.walkInPhone.trim() !== ''
  const wantsCustomer = !customer && (isJob || typedSomeone)
  const whoError = () => (wantsCustomer ? quickCustomerError(meta.walkInName, meta.walkInPhone, isJob) : null)
  const resolveCustomer = async () => {
    if (customer || !wantsCustomer) return customer
    const c = await ensureCustomer(meta.walkInName, meta.walkInPhone)
    setCustomer(c)
    return c
  }
  const fail = (err: unknown) => {
    setError(err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong')
    setSaving(false)
  }

  const saveShopBill = async () => {
    if (lines.length === 0) return setError('Scan or search at least one item, or add a garment for stitching')
    if (lines.some(lineError)) return setError('Fix the highlighted items')
    const who = whoError()
    if (who) return setError(who)
    setSaving(true)
    try {
      const buyer = await resolveCustomer()
      const body = {
        customerId: buyer?.id ?? null,
        walkInName: buyer ? undefined : meta.walkInName.trim() || undefined,
        walkInPhone: buyer ? undefined : meta.walkInPhone.trim() || undefined,
        docDate: meta.docDate, bookNo: (editing ? meta.bookNo?.trim() : '') || undefined, billDiscount: Number(meta.billDiscount) || 0, notes: meta.notes.trim() || undefined,
        lines: lines.map((l) => ({ variantId: l.item.id, qty: Number(l.qty), rate: Number(l.rate), discountPct: Number(l.discountPct) || 0 })),
        tenders: tenderInput(tenders),
        useAdvance: !!buyer && buyer.id === customer?.id && useAdvance && advanceAvailable > 0,
      }
      const sale = editing ? await salesApi.update(editing.id, body) : await salesApi.create(body)
      clearBillDraft()
      setEditing(null)
      toast.success(`${sale.docNo} ${editing ? 'updated' : 'saved'}${Number(sale.changeReturned) > 0 ? ` — give change ₹${Number(sale.changeReturned)}` : ''}`)
      if (autoPrint && profile && settings) printText(billText(sale, profile, settings['billing.print'].columns), settings['billing.print'])
      navigate(`/sales/${sale.id}`)
    } catch (err) { fail(err) }
  }

  // Items + stitching → one stitching job bill (JOB/…); the job page opens for stages, tailor slip and delivery.
  const bookJob = async () => {
    const who = whoError()
    if (who) return setError(`Stitching needs the customer — ${who.toLowerCase()}`)
    if (stitch.some(itemError)) return setError('Fix the highlighted garments')
    if (lines.some(lineError)) return setError('Fix the highlighted items')
    if (deliveryDate < meta.docDate) return setError('Delivery date is before the bill date')
    if (!meta.bookNo?.trim()) return setError('Enter the book no. — it is needed for stitching')
    setSaving(true)
    try {
      const buyer = (await resolveCustomer())!
      const job = await jobsApi.create(jobFromBill({ customerId: buyer.id, docDate: meta.docDate, deliveryDate, discount: meta.billDiscount, notes: meta.notes, bookNo: meta.bookNo ?? '', gstApplied: jobGst, stitch, charges: allCharges, lines, tenders, useAdvance: buyer.id === customer?.id && useAdvance && advanceAvailable > 0 }))
      // New charge names typed here → the garment's list, so they show next time (a failure here doesn't matter).
      await Promise.allSettled(newGarmentCharges(stitch).map(([g, n]) => garmentApi.addCharge(g, n)))
      clearBillDraft()
      toast.success(`${job.docNo} booked — print the tailor slip from the job page`)
      if (autoPrint && profile && settings) printText(jobBillText(job, profile, settings['billing.print'].columns), settings['billing.print'])
      navigate(`/jobs/${job.id}`)
    } catch (err) { fail(err) }
  }

  const save = () => {
    if (saving) return
    setShowErrors(true)
    setError('')
    if (editing && isJob) return setError("A shop bill can't become a stitching job — cancel it and book a job instead")
    return isJob ? bookJob() : saveShopBill()
  }
  const clearAll = () => {
    setLines([]); setStitch([]); setCharges([]); setCustomer(null); setMetaState(freshMeta()); setTenders([newTender()])
    setDeliveryDate(inDays(7)); setError(''); setShowErrors(false); clearBillDraft()
    if (editing) { setEditing(null); setParams({}) }
  }

  return {
    lines, setLines, addItem, changeLine, removeLine, lineCalc,
    customer, setCustomer, meta, setMeta, tenders, setTenders, useAdvance, setUseAdvance, advanceAvailable,
    stitch, setStitch, charges, setCharges, deliveryDate, setDeliveryDate, isJob,
    editing, payable, totals, jobT, jobGstRate, grandTotal, taxMode, gstRegistered,
    autoPrint, toggleAutoPrint, showErrors, error, setError, saving, save, clearAll,
  }
}
export type Billing = ReturnType<typeof useBilling>
