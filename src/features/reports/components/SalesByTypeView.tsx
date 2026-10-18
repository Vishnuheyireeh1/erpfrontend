import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { accountsApi } from '@/features/accounts/api/accounts.api'
import type { SalesByType } from '@/features/accounts/types'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useReportRange } from '../reportUtils'
import { ReportToolbar } from './ReportToolbar'

type Line = SalesByType['lines'][number]
const monthName = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })

// Reports → "Sales by type": the shop's three kinds of income side by side — shop sales (readymade, fabric,
// materials), stitching jobs, training fees — by day or month. Before GST, the same figures as the books.
export function SalesByTypeView() {
  const { range, setRange, from, to } = useReportRange()
  const [by, setBy] = useState<'day' | 'month'>('day')
  const q = useApiQuery(['sales-by-type', from, to, by], () => accountsApi.salesByType({ from, to, by }))
  const r = q.data ?? q.lastData
  const t = r?.totals
  const share = (v: number) => (t && t.total ? `${Math.round((v / t.total) * 100)}% of income` : undefined)

  const columns: Column<Line>[] = [
    { key: 'period', header: by === 'month' ? 'Month' : 'Date', mobile: 'title', render: (l) => <span className="font-medium text-ink">{by === 'month' ? monthName(l.period) : formatDate(l.period)}</span> },
    { key: 'shop', header: 'Shop sales', align: 'right', render: (l) => formatINR(l.shop) },
    { key: 'stitching', header: 'Stitching jobs', align: 'right', render: (l) => formatINR(l.stitching) },
    { key: 'fees', header: 'Training fees', align: 'right', render: (l) => formatINR(l.fees) },
    { key: 'total', header: 'Total', align: 'right', mobile: 'badge', render: (l) => <span className="font-semibold text-ink">{formatINR(l.total)}</span> },
  ]

  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/accounts/sales-by-type/export" params={{ from, to, by }}>
        <div className="inline-flex overflow-hidden rounded-control border border-line" role="group" aria-label="Group by">
          {(['day', 'month'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={by === k} onClick={() => setBy(k)} className={cn('h-10 px-4 text-sm font-medium', by === k ? 'bg-brand text-white' : 'bg-card text-ink-soft hover:bg-page')}>
              {k === 'day' ? 'By day' : 'By month'}
            </button>
          ))}
        </div>
      </ReportToolbar>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Shop sales" value={t ? formatINR(t.shop) : '…'} note={t ? share(t.shop) : undefined} />
        <StatCard label="Stitching jobs" value={t ? formatINR(t.stitching) : '…'} note={t ? share(t.stitching) : undefined} />
        <StatCard label="Training fees" value={t ? formatINR(t.fees) : '…'} note={t ? share(t.fees) : undefined} />
        <StatCard label="Total" value={t ? formatINR(t.total) : '…'} note="Before GST" noteTone="success" />
      </div>
      <Card bodyClassName="p-0">
        {q.error && !r ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable columns={columns} rows={r?.lines ?? []} rowKey={(l) => l.period} loading={!r} emptyTitle="No sales in these dates" />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Shop sales = readymade, fabric and materials sold (counter bills + items on jobs − returns). Stitching = job charges. All before GST.</p>
    </>
  )
}
