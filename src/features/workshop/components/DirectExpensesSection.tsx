import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import type { DateRangeValue } from '@/components/ui/DateRange'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'

type Row = { name: string; salaried: number; paid: number; total: number }
type Report = { rows: Row[]; totals: { salaried: number; paid: number; total: number }; missingCosts: { id: number; docNo: string; customerName: string; grandTotal: string }[] }

const columns: Column<Row>[] = [
  { key: 'name', header: 'Cost type', mobile: 'title', render: (r) => <span className="font-medium text-ink">{r.name}</span> },
  { key: 'salaried', header: 'Salaried (costing only)', align: 'right', render: (r) => (r.salaried ? formatINR(r.salaried) : '—') },
  { key: 'paid', header: 'Paid / payable', align: 'right', render: (r) => (r.paid ? formatINR(r.paid) : '—') },
  { key: 'total', header: 'Total', align: 'right', mobile: 'badge', render: (r) => <span className="font-semibold">{formatINR(r.total)}</span> },
]

// Workshop reports → direct expenses by cost type for the period, and delivered jobs with no cost entered yet.
export function DirectExpensesSection({ range }: { range: DateRangeValue }) {
  const qs = new URLSearchParams({ from: range.from, to: range.to }).toString()
  const q = useApiQuery(['direct-expenses', range], () => api.get<Report>(`/reports/workshop/direct-expenses?${qs}`))
  const d = q.data ?? q.lastData

  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Direct expenses <span className="text-sm font-normal text-muted">(job costs by the day they happened)</span></h2>
        <ExportButton path="/reports/workshop/direct-expenses/export" params={range} />
      </div>
      <Card bodyClassName="p-0" className="mb-5">
        {q.error ? (
          <EmptyState title="Couldn't load" description={q.error} />
        ) : (
          <>
            <DataTable columns={columns} rows={d?.rows ?? []} rowKey={(r) => r.name} loading={q.loading} emptyTitle="No job costs in this period" />
            {d && d.rows.length > 0 && (
              <div className="flex flex-wrap justify-between gap-2 border-t border-line bg-page px-4 py-3 text-sm">
                <span className="font-medium">Total {formatINR(d.totals.total)}</span>
                <span className="text-muted">Salaried {formatINR(d.totals.salaried)} · paid / payable {formatINR(d.totals.paid)}</span>
              </div>
            )}
          </>
        )}
      </Card>
      {d && d.missingCosts.length > 0 && (
        <Card title={`Handed over without any cost (${d.missingCosts.length})`} className="mb-5">
          <p className="mb-2 text-sm text-muted">These jobs have no tailor, no material and no cost entered — their profit looks too high. Add the costs.</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {d.missingCosts.map((j) => (
              <li key={j.id}>
                <Link to={`/jobs/${j.id}`} className="inline-block rounded-control border border-line px-2.5 py-1 text-brand hover:bg-page">{j.docNo} · {j.customerName}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
