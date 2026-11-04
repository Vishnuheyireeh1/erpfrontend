import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Column } from '@/components/ui/DataTable'
import { PagedTable } from '@/components/ui/PagedTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandApi } from '../api/brand.api'
import { brandMoneyApi } from '../api/brandMoney.api'
import { BrandBillsTable, BrandPaymentsTable } from '../components/BrandDocsTables'
import { BrandCustomerModal } from '../components/BrandCustomerModal'
import { clothCols, customerCols, pendingCols, profitCols, summaryCols } from '../components/BrandReportTables'
import type { ClothRow, CustomerRow, PendingRow, ProfitRow, SummaryRow } from '../moneyTypes'

type Kind = 'summary' | 'customers' | 'pending-work' | 'profit' | 'cloth' | 'bills' | 'payments'
type Row = SummaryRow | CustomerRow | PendingRow | ProfitRow | ClothRow
type Result = { rows: Row[]; from?: string; to?: string; totals?: Record<string, number> }

const TABS: { key: Kind; label: string; note: string }[] = [
  { key: 'summary', label: 'Brand summary', note: 'Per brand for the dates: orders, pieces, billed, received — and pending today.' },
  { key: 'customers', label: 'By customer', note: 'Per customer name for orders received in the dates: pieces, delivered, pending and bill amount. Click a customer to see their pieces.' },
  { key: 'pending-work', label: 'Pending work', note: 'Pieces not delivered yet, soonest due first. Late ones in red.' },
  { key: 'profit', label: 'Profit per order', note: 'Orders received in the dates: billed (before GST) − our cloth − tailor pay.' },
  { key: 'cloth', label: "Brand's cloth", note: 'Cloth the brands gave us: received − used − given back = left with us.' },
  { key: 'bills', label: 'Delivery bills', note: 'Every delivery bill with what is still due.' },
  { key: 'payments', label: 'Money received', note: 'Money received from brands.' },
]
const COLS: Record<string, Column<Row>[]> = { summary: summaryCols, customers: customerCols, 'pending-work': pendingCols, profit: profitCols, cloth: clothCols } as unknown as Record<string, Column<Row>[]>
const DATED = new Set<Kind>(['summary', 'customers', 'profit'])

// /brand-reports — all brand reports in one place, each with brand filter, dates and Excel.
export function BrandReportsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind = (params.get('tab') as Kind) || 'summary'
  const [brandId, setBrandId] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState<CustomerRow | null>(null)
  const brands = useApiQuery('brand-options-all', () => brandApi.list({ status: 'all', pageSize: 100 }))
  const p = { brandId: Number(brandId) || undefined, from: DATED.has(kind) ? range.from || undefined : undefined, to: DATED.has(kind) ? range.to || undefined : undefined }
  const isReport = kind in COLS
  const q = useApiQuery(['brand-report', kind, p], () => (isReport ? brandMoneyApi.report<Result>(kind, p) : Promise.resolve(null)))
  const tab = TABS.find((t) => t.key === kind)!
  const t = q.data?.totals
  const word = search.trim().toLowerCase()
  const rows = (q.data?.rows ?? []).filter((r) => kind !== 'customers' || !word || (r as CustomerRow).customer.toLowerCase().includes(word))
  const shown = rows as CustomerRow[]

  return (
    <>
      <button type="button" onClick={() => navigate('/brand-orders')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><IconArrowLeft size={16} /> Brand orders</button>
      <PageHeader title="Brand reports" subtitle={tab.note} />
      <div className="mb-4"><Tabs tabs={TABS.map(({ key, label }) => ({ key, label }))} active={kind} onChange={(k) => setParams(k === 'summary' ? {} : { tab: k })} /></div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select label="Brand" className="w-full sm:w-64" value={brandId} onChange={(e) => setBrandId(e.target.value)} options={[{ value: '', label: 'All brands' }, ...(brands.data?.items ?? []).map((b) => ({ value: String(b.id), label: b.name }))]} />
        {DATED.has(kind) && <DateRange value={range} onChange={setRange} />}
        {kind === 'customers' && <Input label="Customer name" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a name" className="w-full sm:w-56" />}
        {isReport && <ExportButton path={`/reports/brands/${kind}/export`} params={kind === 'customers' ? { ...p, search: word || undefined } : p} />}
      </div>
      {q.data?.from && <p className="mb-2 text-sm text-muted">Showing {q.data.from} to {q.data.to}{range.from || range.to ? '' : ' (this month)'}</p>}
      {t && (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-card bg-card p-3 text-sm shadow-sm">
          {kind === 'summary' && <><span>Billed <b>{formatINR(t.billed)}</b></span><span>Received <b className="text-success">{formatINR(t.received)}</b></span><span>Pending today <b className="text-warn">{formatINR(t.pending)}</b></span><span>Pieces delivered <b>{t.piecesDelivered}</b></span></>}
          {kind === 'customers' && <><span>Customers <b>{shown.length}</b></span><span>Pieces <b>{shown.reduce((s, r) => s + r.pieces, 0)}</b></span><span>Delivered <b className="text-success">{shown.reduce((s, r) => s + r.delivered, 0)}</b></span><span>Pending <b className="text-warn">{shown.reduce((s, r) => s + r.pending, 0)}</b></span><span>Bill amount <b>{formatINR(shown.reduce((s, r) => s + r.amount, 0))}</b></span></>}
          {kind === 'pending-work' && <><span>Pieces <b>{t.pieces}</b></span><span>Ready <b className="text-success">{t.ready}</b></span><span>Late <b className="text-danger">{t.late}</b></span><span>Value <b>{formatINR(t.value)}</b></span></>}
          {kind === 'profit' && <><span>Billed <b>{formatINR(t.billed)}</b></span><span>Our cloth <b>{formatINR(t.ourCloth)}</b></span><span>Tailor pay <b>{formatINR(t.tailorPay)}</b></span><span>Other costs <b>{formatINR(t.otherCosts)}</b></span><span>Profit <b className="text-success">{formatINR(t.profit)}</b></span></>}
        </div>
      )}
      <Card bodyClassName="p-0">
        {kind === 'bills' ? <BrandBillsTable brandId={p.brandId} version={0} />
          : kind === 'payments' ? <BrandPaymentsTable brandId={p.brandId} version={0} />
            : q.error ? <EmptyState title="Couldn't load the report" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
              : (
                <PagedTable
                  columns={COLS[kind]}
                  rows={rows}
                  rowKey={(r) => JSON.stringify(r).slice(0, 120)}
                  loading={q.loading}
                  emptyTitle="Nothing here"
                  onRowClick={(r) => ('customer' in r ? setCustomer(r) : 'orderId' in r ? navigate(`/brand-orders/${r.orderId}`) : 'brandId' in r ? navigate(`/brands/${r.brandId}`) : undefined)}
                />
              )}
      </Card>
      {customer && <BrandCustomerModal row={customer} onClose={() => setCustomer(null)} />}
    </>
  )
}
