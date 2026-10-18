import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { ExportButton } from '@/components/ui/ExportButton'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandMoneyApi } from '../api/brandMoney.api'
import type { StatementRow } from '../moneyTypes'

// Running statement of a brand: opening → bills (+) / money received (−) → pending (+ = they owe us).
export function BrandStatementTable({ brandId, version }: { brandId: number; version: number }) {
  const navigate = useNavigate()
  const q = useApiQuery(['brand-statement', brandId, version], () => brandMoneyApi.statement(brandId))
  const columns: Column<StatementRow>[] = [
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.date) },
    { key: 'doc', header: 'Document', mobile: 'title', render: (r) => <span className="font-medium text-brand">{r.docNo}</span> },
    { key: 'detail', header: 'Details', mobile: 'hidden', render: (r) => r.detail },
    { key: 'billed', header: 'Billed', align: 'right', render: (r) => (r.billed ? formatINR(r.billed) : '') },
    { key: 'received', header: 'Received', align: 'right', render: (r) => (r.received ? <span className="text-success">{formatINR(r.received)}</span> : '') },
    { key: 'balance', header: 'Pending', align: 'right', mobile: 'badge', render: (r) => <span className="font-medium">{formatINR(r.balance)}</span> },
  ]
  if (q.error) return <EmptyState title="Couldn't load the statement" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
        <span>Opening {formatINR(q.data?.opening ?? 0)} → pending now <span className="font-semibold">{formatINR(q.data?.closing ?? 0)}</span></span>
        <ExportButton path={`/brands/${brandId}/statement/export`} />
      </div>
      <DataTable
        columns={columns}
        rows={q.data?.rows ?? []}
        rowKey={(r) => `${r.type}${r.id}`}
        loading={q.loading}
        emptyTitle="Nothing yet"
        emptyDescription="Delivery bills and money received from this brand show here."
        onRowClick={(r) => (r.type === 'BILL' ? navigate(`/brand-bills/${r.id}`) : undefined)}
      />
    </>
  )
}
