import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { todayISO } from '@/features/inventory/constants'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { payTypeLabels } from '../api/workshop.api'
import { DirectExpensesSection } from '../components/DirectExpensesSection'
import { JobProfitList, type JobProfitRow } from '../components/JobProfitList'
import type { PayType } from '../types'

type TailorRow = { id: number; code: string; name: string; payType: PayType; jobs: number; pieces: number; labour: number; paid: number; balance: number | null }
type TailorWork = { from: string; to: string; rows: TailorRow[]; totals: { jobs: number; pieces: number; labour: number; paid: number } }
type GarmentRow = { garment: string; pieces: number; charge: number; labour: number }
type JobProfit = {
  from: string
  to: string
  totals: { jobs: number; delivered: number; charged: number; gst: number; materialCost: number; labourCost: number; otherCost: number; costTotal: number; profit: number; marginPct: number }
  garments: GarmentRow[]
  jobs: JobProfitRow[]
}

const tailorColumns: Column<TailorRow>[] = [
  { key: 'name', header: 'Tailor', mobile: 'title', render: (t) => <span className="font-medium text-ink">{t.name}</span> },
  { key: 'pay', header: 'Paid', mobile: 'subtitle', render: (t) => payTypeLabels[t.payType] },
  { key: 'jobs', header: 'Jobs', align: 'right', render: (t) => t.jobs },
  { key: 'pieces', header: 'Pieces', align: 'right', render: (t) => t.pieces },
  { key: 'labour', header: 'Pay earned', align: 'right', mobile: 'badge', render: (t) => formatINR(t.labour) },
  { key: 'paidAmt', header: 'Paid in period', align: 'right', render: (t) => formatINR(t.paid) },
  { key: 'balance', header: 'Balance now', align: 'right', render: (t) => (t.balance === null ? '—' : formatINR(t.balance)) },
]
const garmentColumns: Column<GarmentRow>[] = [
  { key: 'garment', header: 'Garment', mobile: 'title', render: (g) => <span className="font-medium text-ink">{g.garment}</span> },
  { key: 'pieces', header: 'Pieces', align: 'right', mobile: 'subtitle', render: (g) => `${g.pieces} pcs` },
  { key: 'charge', header: 'Stitching charge', align: 'right', render: (g) => formatINR(g.charge) },
  { key: 'labour', header: 'Tailor pay', align: 'right', render: (g) => formatINR(g.labour) },
  { key: 'margin', header: 'Margin', align: 'right', mobile: 'badge', render: (g) => formatINR(g.charge - g.labour) },
]

const qs = (r: DateRangeValue) => new URLSearchParams({ from: r.from, to: r.to }).toString()

// /workshop-reports — tailor workload & labour cost, and job profitability for a period (default: this month).
export function WorkshopReportsPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const work = useApiQuery(['tailor-work', range], () => api.get<TailorWork>(`/reports/workshop/tailor-work?${qs(range)}`))
  const profit = useApiQuery(['job-profit', range], () => api.get<JobProfit>(`/reports/workshop/job-profit?${qs(range)}`))
  const t = (profit.data ?? profit.lastData)?.totals

  return (
    <>
      <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Back
      </button>
      <PageHeader title="Workshop reports" subtitle="Stitching profit, direct expenses and tailor work for the dates you choose." />
      <DateRange value={range} onChange={(r) => setRange(r.from && r.to ? r : { from: `${todayISO().slice(0, 8)}01`, to: todayISO() })} className="mb-5" />

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Job profit <span className="text-sm font-normal text-muted">(jobs booked in the period)</span></h2>
        <ExportButton path="/reports/workshop/job-profit/export" params={range} />
      </div>
      {profit.error ? (
        <Card className="mb-6"><EmptyState title="Couldn't load" description={profit.error} /></Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Jobs" value={String(t?.jobs ?? '…')} note={t ? `${t.delivered} handed over` : undefined} />
            <StatCard label="Stitching charged (before GST)" value={t ? formatINR(t.charged) : '…'} note={t && t.gst ? `+ GST ${formatINR(t.gst)}` : undefined} />
            <StatCard label="Actual cost" value={t ? formatINR(t.costTotal) : '…'} note={t ? `Tailor ${formatINR(t.labourCost)} · job costs ${formatINR(t.otherCost)} · cloth given free ${formatINR(t.materialCost)}` : undefined} />
            <StatCard label="Profit" value={t ? formatINR(t.profit) : '…'} note={t ? `${t.marginPct}% margin` : undefined} noteTone={t && t.profit < 0 ? 'warn' : 'success'} />
          </div>
          <JobProfitList rows={profit.data?.jobs ?? []} loading={profit.loading} />
          <Card title="By garment" bodyClassName="p-0" className="mb-6">
            <DataTable columns={garmentColumns} rows={profit.data?.garments ?? []} rowKey={(g) => g.garment} loading={profit.loading} emptyTitle="No jobs in this period" />
          </Card>
        </>
      )}

      <DirectExpensesSection range={range} />

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Tailor work <span className="text-sm font-normal text-muted">(by the day jobs got Ready)</span></h2>
        <ExportButton path="/reports/workshop/tailor-work/export" params={range} />
      </div>
      <Card bodyClassName="p-0">
        {work.error ? (
          <EmptyState title="Couldn't load" description={work.error} />
        ) : (
          <>
            <DataTable columns={tailorColumns} rows={work.data?.rows ?? []} rowKey={(r) => r.id} loading={work.loading} emptyTitle="No tailors yet" onRowClick={(r) => navigate(`/tailors/${r.id}`)} />
            {work.data && (
              <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-page px-4 py-3 text-sm">
                <span className="font-medium">Total</span>
                <span>{work.data.totals.jobs} jobs · {work.data.totals.pieces} pcs · labour {formatINR(work.data.totals.labour)} · paid {formatINR(work.data.totals.paid)}</span>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
