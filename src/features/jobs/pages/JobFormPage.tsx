import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { clearBillDraft } from '@/features/sales/billDraft'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ResizableSplit } from '@/components/ui/ResizableSplit'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { customerApi } from '@/features/sales/api/sales.api'
import { CustomerQuickField } from '@/features/sales/components/CustomerQuickField'
import { ensureCustomer, quickCustomerError } from '@/features/sales/customerQuick'
import { newTender, tenderInput, type TenderRow } from '@/features/sales/tenders'
import type { Customer } from '@/features/sales/types'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { garmentApi, measurementApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { printText } from '@/features/sales/print/printing'
import { Switch } from '@/components/ui/Switch'
import { ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { JobCostsEditor } from '../components/JobCostsEditor'
import { JobFormSummary, type JobMeta } from '../components/JobFormSummary'
import { JobItemEditor } from '../components/JobItemEditor'
import { fromJob, itemError, newItem, newProduct, productError, productsTotal, toJobInput, toProductInput, type CostDraft, type ItemDraft, type ProductDraft } from '../jobDrafts'
import { ProductLinesEditor } from '../components/ProductLinesEditor'
import type { StockItem } from '@/features/inventory/types'
import { calcJob, isOpen } from '../jobUtils'
import { jobBillText } from '../print/jobText'
import type { Job } from '../types'

const PRINT_KEY = 'sairandhri.jobs.autoPrint'
const readAutoPrint = () => {
  try { return localStorage.getItem(PRINT_KEY) !== '0' } catch { return true }
}
const inDays = (n: number) => {
  const d = new Date(todayISO() + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// /jobs/new (?customer= ?parent=) and /jobs/:id/edit — loads the job first when editing.
export function JobFormPage() {
  const id = Number(useParams().id) || 0
  const q = useApiQuery(['job-edit', id], () => (id ? jobsApi.get(id) : Promise.resolve(null)))
  if (!id) return <JobForm job={null} />
  if (q.error) return <Card><EmptyState title="Couldn't open this job" description={q.error} /></Card>
  if (!q.data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  if (!isOpen(q.data.status)) return <Card><EmptyState title={`${q.data.docNo} can't be edited`} description="Handed-over and cancelled jobs are locked — make an alteration job instead." /></Card>
  return <JobForm job={q.data} />
}

function JobForm({ job }: { job: Job | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  // From the billing counter: items already scanned there ("Add stitching").
  const fromCounter = (useLocation().state as { items?: { item: StockItem; qty: string; rate: string; discountPct: string }[] } | null)?.items
  const { profile, settings } = useBusinessProfile()
  const garments = useApiQuery('garments', () => garmentApi.list())
  const tailors = useApiQuery('tailor-options', () => tailorApi.options())
  const parentId = Number(params.get('parent')) || null
  const presetId = job?.customerId ?? (Number(params.get('customer')) || 0)
  const preset = useApiQuery(['job-customer', presetId], () => (presetId ? customerApi.get(presetId) : Promise.resolve(null)))

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [who, setWho] = useState({ name: '', phone: '' }) // new customer typed here (saved with the job)
  const [presetDone, setPresetDone] = useState(false)
  if (!presetDone && preset.data) {
    setPresetDone(true)
    setCustomer(preset.data)
  }
  const measures = useApiQuery(['job-measures', customer?.id], () => (customer ? measurementApi.list(customer.id) : Promise.resolve([])))
  const advance = useApiQuery(['advance', customer?.id, !!job], () => (customer && !job ? customerApi.advance(customer.id) : Promise.resolve(null)))

  const initial = job ? fromJob(job) : null
  const [items, setItems] = useState<ItemDraft[]>(() => initial?.items ?? [newItem()])
  const [costs, setCosts] = useState<CostDraft[]>(() => initial?.costs ?? [])
  const [products, setProducts] = useState<ProductDraft[]>(() => (fromCounter ?? []).map((x) => ({ ...newProduct(x.item), qty: x.qty, rate: x.rate, discountPct: x.discountPct })))
  const [meta, setMeta] = useState<JobMeta>(() => ({
    docDate: todayISO(),
    expectedDate: job ? job.expectedDate.slice(0, 10) : inDays(7),
    gstApplied: job ? Number(job.gstRate) > 0 : false,
    discount: job ? String(Number(job.discount)) : '',
    notes: job?.notes ?? '',
    internalNotes: job?.internalNotes ?? '',
  }))
  const [gstDefaulted, setGstDefaulted] = useState(!!job)
  if (!gstDefaulted && settings) {
    setGstDefaulted(true)
    setMeta((m) => ({ ...m, gstApplied: settings['jobs.gst'].defaultOn && !!profile?.gstRegistered }))
  }
  const [tenders, setTenders] = useState<TenderRow[]>(() => [newTender()])
  const [useAdvance, setUseAdvance] = useState(true)
  const [autoPrint, setAutoPrint] = useState(readAutoPrint)
  const toggleAutoPrint = (v: boolean) => {
    setAutoPrint(v)
    try { localStorage.setItem(PRINT_KEY, v ? '1' : '0') } catch { /* private mode */ }
  }
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const gstRate = meta.gstApplied && profile?.gstRegistered ? (job && Number(job.gstRate) > 0 ? Number(job.gstRate) : settings?.['jobs.gst'].rate ?? 5) : 0
  const itemsTotal = job ? job.materials.filter((m) => !m.included).reduce((s, m) => s + Number(m.amount), 0) : productsTotal(products)
  const totals = useMemo(
    () =>
      calcJob({
        items: items.map((d) => ({ qty: Number(d.qty) || 0, chargeRate: Number(d.chargeRate) || 0, labourRate: Number(d.labourRate) || 0 })),
        itemsTotal,
        costs: costs.map((c) => ({ charge: Number(c.charge) || 0 })),
        discount: Number(meta.discount) || 0,
        gstRate,
      }),
    [items, costs, meta.discount, gstRate, itemsTotal],
  )
  // Latest measurements of this customer per garment (list is newest first).
  const latestFor = (gid: number) => measures.data?.find((m) => m.garmentTypeId === gid)?.values

  const setItem = (key: string, patch: Partial<ItemDraft>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  const save = async () => {
    setShowErrors(true)
    setError('')
    const whoError = !job && !customer ? quickCustomerError(who.name, who.phone) : null
    if (whoError) return setError(whoError)
    if (items.some(itemError)) return setError('Fix the highlighted garments')
    if (products.some(productError)) return setError('Fix the highlighted items')
    if (meta.expectedDate < (job ? job.docDate.slice(0, 10) : meta.docDate)) return setError('Ready-by date is before the order date')
    setSaving(true)
    try {
      const body = toJobInput(meta, items, costs)
      const buyer = job ? null : customer ?? (await ensureCustomer(who.name, who.phone))
      if (buyer && !customer) setCustomer(buyer)
      const saved = job
        ? await jobsApi.update(job.id, body)
        : await jobsApi.create({ ...body, customerId: buyer!.id, docDate: meta.docDate, parentJobId: parentId, tenders: tenderInput(tenders), useAdvance: buyer!.id === customer?.id && useAdvance && (advance.data?.total ?? 0) > 0, products: toProductInput(products) })
      toast.success(job ? `${saved.docNo} updated` : `${saved.docNo} booked`)
      if (!job && fromCounter?.length) clearBillDraft() // the counter items are on this job bill now
      if (!job && autoPrint && profile && settings) printText(jobBillText(saved, profile, settings['billing.print'].columns), settings['billing.print'])
      navigate(`/jobs/${saved.id}`)
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  if (!garments.data || !tailors.data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate(job ? `/jobs/${job.id}` : '/jobs')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {job ? job.docNo : 'Stitching jobs'}
      </button>
      <PageHeader title={job ? `Edit ${job.docNo}` : parentId ? 'New alteration job' : 'New stitching job'} subtitle="Garments, measurements, tailor and price. The bill is made when you save." />

      {/* Right panel width: drag the handle between the two sides (remembered per browser). */}
      <ResizableSplit
        storageKey="sairandhri.jobs.panelWidth"
        defaultWidth={420}
        minLeft={520}
        left={
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="@container">
                <p className="mb-1.5 text-sm font-medium text-ink">Customer</p>
                {job ? <p className="flex h-11 items-center text-sm text-ink">{job.customerName}{job.customerPhone ? ` · ${job.customerPhone}` : ''}</p> : (
                  <CustomerQuickField value={customer} onChange={setCustomer} name={who.name} phone={who.phone} onName={(name) => setWho((w) => ({ ...w, name }))} onPhone={(phone) => setWho((w) => ({ ...w, phone }))} showErrors={showErrors} />
                )}
              </div>
              {!job && <Input label="Order date" type="date" max={todayISO()} value={meta.docDate} onChange={(e) => setMeta((m) => ({ ...m, docDate: e.target.value }))} />}
              <Input label="Ready by" type="date" min={job ? job.docDate.slice(0, 10) : meta.docDate} value={meta.expectedDate} onChange={(e) => setMeta((m) => ({ ...m, expectedDate: e.target.value }))} />
            </div>
          </Card>

          <Card title={`Garments (${items.length})`}>
            <div className="flex flex-col gap-4">
              {items.map((d, i) => (
                <JobItemEditor showMeasuredBy
                  key={d.key}
                  index={i}
                  draft={d}
                  garments={garments.data!}
                  tailors={tailors.data!}
                  latestFor={latestFor}
                  error={showErrors ? itemError(d) : undefined}
                  onChange={(p) => setItem(d.key, p)}
                  onRemove={items.length > 1 ? () => setItems((xs) => xs.filter((x) => x.key !== d.key)) : undefined}
                />
              ))}
              <Button icon={IconPlus} onClick={() => setItems((xs) => [...xs, newItem()])} className="w-fit">Add garment</Button>
            </div>
          </Card>

          <Card title={`Readymade items & fabric${products.length ? ` (${products.length})` : ''}`}>
            {job ? (
              <p className="text-sm text-muted">Add or return items on the job page.</p>
            ) : (
              <ProductLinesEditor rows={products} onChange={setProducts} showErrors={showErrors} />
            )}
          </Card>

          <Card title="Extra charges on the bill">
            <JobCostsEditor rows={costs} onChange={setCosts} />
          </Card>
        </div>
        }
        right={
        <Card className="self-start">
          <JobFormSummary
            totals={totals}
            meta={meta}
            onMeta={(p) => setMeta((m) => ({ ...m, ...p }))}
            gstRegistered={!!profile?.gstRegistered}
            gstRate={gstRate || settings?.['jobs.gst'].rate || 5}
            isNew={!job}
            paid={Number(job?.paidAmount ?? 0)}
            tenders={tenders}
            onTenders={setTenders}
            advanceAvailable={advance.data?.total ?? 0}
            useAdvance={useAdvance}
            onUseAdvance={setUseAdvance}
          />
          {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
          {!job && <div className="mt-4"><Switch label="Print bill after booking" checked={autoPrint} onChange={toggleAutoPrint} /></div>}
          <Button variant="primary" loading={saving} onClick={save} className="mt-4 h-12 w-full text-base">
            {job ? 'Save changes' : `Book job · ₹${totals.grandTotal.toLocaleString('en-IN')}`}
          </Button>
        </Card>
        }
      />
    </>
  )
}
