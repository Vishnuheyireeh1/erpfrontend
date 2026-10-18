import { IconList, IconPrinter } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { jobsApi } from '@/features/jobs/api/jobs.api'
import { itemError, type ItemDraft } from '@/features/jobs/jobDrafts'
import { jobBillText } from '@/features/jobs/print/jobText'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { useApiQuery } from '@/lib/useApiQuery'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { ApiError } from '@/lib/api'
import { taxModeFor } from '@/lib/gst'
import { customerApi, salesApi } from '../api/sales.api'
import { calcSale } from '../calc'
import { clearBillDraft, readBillDraft, saveBillDraft } from '../billDraft'
import { BillCustomerBar } from '../components/BillCustomerBar'
import { BillItemsCard } from '../components/BillItemsCard'
import { BillStitchingCard } from '../components/BillStitchingCard'
import { JobBillTotals } from '../components/JobBillTotals'
import { BillPaymentPanel, type BillMeta } from '../components/BillPaymentPanel'
import type { SaleLineDraft } from '../components/SaleLineRow'
import { SaleTotals } from '../components/SaleTotals'
import { StepCard } from '../components/StepCard'
import { billText } from '../print/billText'
import { printText } from '../print/printing'
import { ensureCustomer, quickCustomerError } from '../customerQuick'
import { jobBillTotals, jobFromBill } from '../jobBill'
import { newTender, tenderInput, type TenderRow } from '../tenders'
import type { Customer } from '../types'
import { startQty, unitWord } from '../units'

let seq = 0
const PRINT_KEY = 'sairandhri.billing.autoPrint'
const readAutoPrint = () => {
  try { return localStorage.getItem(PRINT_KEY) !== '0' } catch { return true }
}
const lineError = (l: SaleLineDraft) => {
  const q = Number(l.qty)
  if (!(q > 0)) return l.item.product.unit.allowDecimal ? `Enter the ${unitWord(l.item.product.unit.code).toLowerCase()}` : 'Enter a quantity above 0'
  if (!l.item.product.unit.allowDecimal && !Number.isInteger(q)) return `Whole ${l.item.product.unit.code} only`
  if (l.rate === '' || Number(l.rate) < 0) return 'Enter the rate'
  return undefined
}
const inDays = (n: number) => new Date(Date.parse(`${todayISO()}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const freshMeta = (): BillMeta => ({ walkInName: '', walkInPhone: '', billDiscount: '', notes: '', docDate: todayISO(), bookNo: '' })

// /billing — the counter, ONE page for every bill. Toggle on top:
//   Shop bill     → items only, paid in full (SDB/…).
//   Stitching job → garments + any items on one job bill (JOB/…): items paid now, stitching advance + balance.
// No switch: choosing a garment in "Anything to stitch?" turns the same bill into a stitching job.
export function BillingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, settings } = useBusinessProfile()
  // An unfinished bill comes back when staff return to this page (e.g. after "Add stitching" and Back).
  const [draft] = useState(readBillDraft)
  const [lines, setLines] = useState<SaleLineDraft[]>(() => draft?.lines ?? [])
  const [customer, setCustomer] = useState<Customer | null>(() => draft?.customer ?? null)
  const [meta, setMeta] = useState<BillMeta>(() => draft?.meta ?? freshMeta())
  const [tenders, setTenders] = useState<TenderRow[]>(() => (draft?.tenders?.length ? draft.tenders : [newTender()]))
  const [autoPrint, setAutoPrint] = useState(readAutoPrint)
  const [useAdvance, setUseAdvance] = useState(() => draft?.useAdvance ?? true)
  const [params] = useSearchParams()
  const [stitch, setStitch] = useState<ItemDraft[]>(() => draft?.stitch ?? [])
  const [deliveryDate, setDeliveryDate] = useState(() => draft?.deliveryDate ?? inDays(7))
  const isJob = stitch.length > 0 // a garment to stitch on the bill → it is booked as a stitching job
  useEffect(() => saveBillDraft({ lines, customer, meta, tenders, useAdvance, stitch, deliveryDate }), [lines, customer, meta, tenders, useAdvance, stitch, deliveryDate])
  const told = useRef(false)
  useEffect(() => {
    if (told.current || !(draft?.lines.length || draft?.stitch?.length || draft?.customer)) return
    told.current = true
    toast.success('Your unsaved bill is back — continue or press Clear')
  }, [draft, toast])
  const advance = useApiQuery(['advance', customer?.id], () => (customer ? customerApi.advance(customer.id) : Promise.resolve(null)))
  const advanceAvailable = advance.data?.total ?? 0
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // /billing?customer=12 (from the customer page) → that customer is chosen once loaded.
  const presetId = Number(params.get('customer')) || 0
  const preset = useApiQuery(['bill-customer', presetId], () => (presetId ? customerApi.get(presetId) : Promise.resolve(null)))
  const [presetDone, setPresetDone] = useState(false)
  if (!presetDone && preset.data) {
    setPresetDone(true)
    setCustomer(preset.data)
  }

  const gstRegistered = profile?.gstRegistered ?? false
  const taxMode = taxModeFor(profile?.stateCode ?? '32', customer?.stateCode) as 'INTRA' | 'INTER'
  const totals = useMemo(
    () =>
      calcSale({
        lines: lines.map((l) => ({ qty: Number(l.qty) || 0, rate: Number(l.rate) || 0, discountPct: Number(l.discountPct) || 0, productGstRate: Number(l.item.product.taxRate?.rate ?? 0), hsnCode: l.item.product.hsnCode ?? null })),
        billDiscount: Number(meta.billDiscount) || 0,
        taxMode,
        gstRegistered,
        apparelRule: settings?.['billing.apparelGstRule'] ?? true,
      }),
    [lines, meta.billDiscount, taxMode, gstRegistered, settings],
  )
  // With stitching: job GST as set in Settings → Stitching jobs (off for this shop); bill discount = stitching discount.
  const jobGst = !!settings?.['jobs.gst'].defaultOn && gstRegistered
  const jobGstRate = jobGst ? settings?.['jobs.gst'].rate ?? 0 : 0
  const jobT = useMemo(
    () => jobBillTotals({ lines, stitch, discount: meta.billDiscount, gstRate: jobGstRate, apparelRule: settings?.['billing.apparelGstRule'] ?? true, taxMode, gstRegistered }),
    [lines, stitch, meta.billDiscount, jobGstRate, settings, taxMode, gstRegistered],
  )
  const soldIndex = new Map(lines.filter((l) => !l.included).map((l, i) => [l.key, i]))
  const lineCalc = (l: SaleLineDraft, i: number) => (isJob ? jobT.items.lines[soldIndex.get(l.key) ?? -1] : totals.lines[i])
  const grandTotal = isJob ? jobT.job.grandTotal : totals.grandTotal

  // Scanning the same item again adds 1 to its quantity.
  const addItem = (item: StockItem) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id)
      // Metre / decimal items: picking again just jumps to that line (staff type the amount); pieces add one more.
      if (existing) return ls.map((l) => (l === existing ? (item.product.unit.allowDecimal ? { ...l, focus: true } : { ...l, qty: String((Number(l.qty) || 0) + 1) }) : { ...l, focus: false }))
      const fresh = { key: `s${++seq}`, item, qty: startQty(item.product.unit.allowDecimal), rate: String(Number(item.sellingPrice)), discountPct: '', focus: item.product.unit.allowDecimal }
      return [...ls.map((l) => ({ ...l, focus: false })), fresh]
    })
  const change = (key: string, patch: Partial<SaleLineDraft>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const toggleAutoPrint = (v: boolean) => {
    setAutoPrint(v)
    try { localStorage.setItem(PRINT_KEY, v ? '1' : '0') } catch { /* private mode — keep in memory only */ }
  }

  // Everyone who buys is saved: nobody picked → the typed name (+ phone) becomes a customer (same phone = same
  // customer). Shop bill with both empty → a quick walk-in bill. Stitching needs name + phone.
  const typedSomeone = meta.walkInName.trim() !== '' || meta.walkInPhone.trim() !== ''
  const wantsCustomer = !customer && (isJob || typedSomeone)
  const whoError = () => (wantsCustomer ? quickCustomerError(meta.walkInName, meta.walkInPhone, isJob) : null)
  const resolveCustomer = async () => {
    if (customer || !wantsCustomer) return customer
    const c = await ensureCustomer(meta.walkInName, meta.walkInPhone)
    setCustomer(c)
    return c
  }

  const save = async () => {
    setShowErrors(true)
    setError('')
    if (isJob) return bookJob()
    if (lines.length === 0) return setError('Scan or search at least one item, or add a garment for stitching')
    if (lines.some(lineError)) return setError('Fix the highlighted items')
    const who = whoError()
    if (who) return setError(who)
    setSaving(true)
    try {
      const buyer = await resolveCustomer()
      const sale = await salesApi.create({
        customerId: buyer?.id ?? null,
        walkInName: buyer ? undefined : meta.walkInName.trim() || undefined,
        walkInPhone: buyer ? undefined : meta.walkInPhone.trim() || undefined,
        docDate: meta.docDate,
        bookNo: meta.bookNo?.trim() || undefined,
        billDiscount: Number(meta.billDiscount) || 0,
        notes: meta.notes.trim() || undefined,
        lines: lines.map((l) => ({ variantId: l.item.id, qty: Number(l.qty), rate: Number(l.rate), discountPct: Number(l.discountPct) || 0 })),
        tenders: tenderInput(tenders),
        useAdvance: !!buyer && buyer.id === customer?.id && useAdvance && advanceAvailable > 0,
      })
      clearBillDraft()
      toast.success(`${sale.docNo} saved${Number(sale.changeReturned) > 0 ? ` — give change ₹${Number(sale.changeReturned)}` : ''}`)
      if (autoPrint && profile && settings) printText(billText(sale, profile, settings['billing.print'].columns), settings['billing.print'])
      navigate(`/sales/${sale.id}`)
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // Items + stitching → one stitching job bill (JOB/…); the job page opens for stages, tailor slip and delivery.
  const bookJob = async () => {
    if (stitch.length === 0) return setError('Tap the garment to stitch (step 2) — or switch to Shop bill')
    const who = whoError()
    if (who) return setError(`Stitching needs the customer — ${who.toLowerCase()}`)
    if (stitch.some(itemError)) return setError('Fix the highlighted garments')
    if (lines.some(lineError)) return setError('Fix the highlighted items')
    if (deliveryDate < meta.docDate) return setError('Delivery date is before the bill date')
    setSaving(true)
    try {
      const buyer = (await resolveCustomer())!
      const job = await jobsApi.create(jobFromBill({ customerId: buyer.id, docDate: meta.docDate, deliveryDate, discount: meta.billDiscount, notes: meta.notes, bookNo: meta.bookNo ?? '', gstApplied: jobGst, stitch, lines, tenders, useAdvance: buyer.id === customer?.id && useAdvance && advanceAvailable > 0 }))
      clearBillDraft()
      toast.success(`${job.docNo} booked — print the tailor slip from the job page`)
      if (autoPrint && profile && settings) printText(jobBillText(job, profile, settings['billing.print'].columns), settings['billing.print'])
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }
  const clearAll = () => { setLines([]); setStitch([]); setCustomer(null); setMeta(freshMeta()); setTenders([newTender()]); setDeliveryDate(inDays(7)); setError(''); setShowErrors(false); clearBillDraft() }

  const customerBar = (
    <BillCustomerBar customer={customer} onCustomer={setCustomer} meta={meta} onMeta={(p) => setMeta((m) => ({ ...m, ...p }))} needsCustomer={isJob} showErrors={showErrors} />
  )
  const itemsCard = (
    <BillItemsCard
      step={2}
      stitching={isJob}
      lines={lines}
      calc={lineCalc}
      errorOf={(l) => (showErrors ? lineError(l) : undefined)}
      onAdd={addItem}
      onChange={change}
      onRemove={(key) => setLines((ls) => ls.filter((x) => x.key !== key))}
    />
  )

  const wide = useMediaQuery('(min-width: 1024px)') // laptop: two columns; phone / tablet: one column in step order
  const customerStep = <StepCard step={1} title="Customer">{customerBar}</StepCard>
  const stitchStep = <BillStitchingCard step={3} drafts={stitch} onChange={(d) => { setStitch(d); setError('') }} customerId={customer?.id} deliveryDate={deliveryDate} minDate={meta.docDate} onDelivery={setDeliveryDate} showErrors={showErrors} />
  const paymentStep = (
    <StepCard step={4} title="Payment">
      <BillPaymentPanel
        customer={customer}
        meta={meta}
        onMeta={(p) => setMeta((m) => ({ ...m, ...p }))}
        tenders={tenders}
        onTenders={setTenders}
        grandTotal={grandTotal}
        jobItemsTotal={isJob ? jobT.items.grandTotal : null}
        maxDate={todayISO()}
        advanceAvailable={advanceAvailable}
        useAdvance={useAdvance}
        onUseAdvance={setUseAdvance}
      />
    </StepCard>
  )
  const totalsCard = (
    <Card>
      {isJob ? (
        <JobBillTotals items={jobT.items.grandTotal} stitching={jobT.job.stitchCharges} discount={jobT.job.discount} gst={jobT.job.gst} gstRate={jobGstRate} roundOff={jobT.job.roundOff} total={jobT.job.grandTotal} />
      ) : (
        <SaleTotals totals={totals} taxMode={taxMode} gstRegistered={gstRegistered} />
      )}
      {customer && taxMode === 'INTER' && <div className="mt-2"><Badge tone="info">Other state — IGST</Badge></div>}
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-col gap-3">
        <Switch label="Print after saving" checked={autoPrint} onChange={toggleAutoPrint} />
        <Button variant="primary" icon={IconPrinter} loading={saving} onClick={save} className="h-12 w-full text-base">
          {isJob ? 'Book stitching job' : 'Save bill'}{grandTotal > 0 ? ` · ₹${grandTotal.toLocaleString('en-IN')}` : ''}
        </Button>
        {(lines.length > 0 || stitch.length > 0 || customer) && <Button onClick={clearAll}>Clear</Button>}
      </div>
    </Card>
  )

  return (
    <>
      <PageHeader
        title="New bill"
        actions={<Button icon={IconList} onClick={() => navigate(isJob ? '/jobs' : '/sales')}>{isJob ? 'All jobs' : 'All bills'}</Button>}
      />
      {/* One page for every bill: 1 Customer | 2 What are they buying, then 3 Anything to stitch | 4 Payment (stacked on phone). */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {customerStep}
          {wide && stitchStep}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {itemsCard}
          {!wide && stitchStep}
          {paymentStep}
          {totalsCard}
        </div>
      </div>
    </>
  )
}
