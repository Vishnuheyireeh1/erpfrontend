import { IconSearch } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import type { PaymentMode } from '@/features/purchase/types'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { financeApi, type CostKind, type CostRow } from '../api/finance.api'
import type { ListOrder } from '@/lib/useListOrder'

type Props = {
  from: string
  to: string
  order: ListOrder
  kind: CostKind | ''
  search: string
  version: number
  onKind: (k: CostKind | '') => void
  onSearch: (s: string) => void
  onCancel: (row: CostRow) => void
}

const auto: Record<string, string> = { SALARY: 'From Staff & salary', WORKER_PAY: 'From the job', BRAND_PAY: 'From the brand order', BRAND_CLOTH: 'From the brand order', JOB_COST: 'From the job', BRAND_COST: 'From the brand order', MATERIAL: 'From the job', ADJUST: 'From Stock' }
const link = (r: CostRow) => (r.source === 'SALARY' ? '/employees?tab=salary' : r.source === 'ADJUST' ? `/stock/documents/${r.refId}` : r.source === 'EXPENSE' ? null : r.source === 'BRAND_PAY' || r.source === 'BRAND_CLOTH' || r.source === 'BRAND_COST' ? `/brand-orders/${r.refId}` : `/jobs/${r.refId}`)

// Expenses page: every cost of the dates in ONE list — typed expenses + salary + per-piece worker pay + job costs …
// The three total cards (All / Direct / Indirect) are also the filter. Same totals as profit & loss.
export function AllCostsView({ from, to, order, kind, search, version, onKind, onSearch, onCancel }: Props) {
  const navigate = useNavigate()
  const q = useDebounce(search.trim())
  const all = useApiQuery(['costs', from, to, q, order, version], () => financeApi.costs({ from, to, order, search: q || undefined }))
  const t = all.data?.totals
  const rows = (all.data?.rows ?? []).filter((r) => !kind || r.kind === kind)

  const columns: Column<CostRow>[] = [
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.date) },
    {
      key: 'what',
      header: 'Expense',
      mobile: 'title',
      render: (r) => (
        <span className="block min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{r.what}</span>
            <Badge tone={r.kind === 'ASSET' ? 'success' : r.kind === 'DIRECT' ? 'info' : 'neutral'}>{r.kind === 'ASSET' ? 'Asset' : r.kind === 'DIRECT' ? 'Direct' : 'Indirect'}</Badge>
          </span>
          {r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}
        </span>
      ),
    },
    { key: 'doc', header: 'Document', render: (r) => <span className="text-xs text-muted">{r.docNo}{auto[r.source] ? ` · ${auto[r.source]}` : ''}</span> },
    { key: 'mode', header: 'Paid by', render: (r) => (r.mode ? paymentModeLabels[r.mode as PaymentMode] ?? r.mode : <span className="text-muted">—</span>) },
    { key: 'amount', header: 'Amount', align: 'right', mobile: 'badge', render: (r) => (r.cancelled ? <Badge>Cancelled</Badge> : <span className="font-semibold">{formatINR(r.amount)}</span>) },
    {
      key: 'cancel', header: '', align: 'right', mobile: 'hidden',
      render: (r) => (r.source === 'EXPENSE' && !r.cancelled ? <button type="button" onClick={(e) => { e.stopPropagation(); onCancel(r) }} className="text-sm text-muted hover:text-danger">Cancel</button> : null),
    },
  ]
  const card = (k: CostKind | '', label: string, value: number | undefined, hint: string) => (
    <button
      type="button"
      aria-pressed={kind === k}
      onClick={() => onKind(k)}
      className={cn('rounded-card border p-4 text-left transition-colors', kind === k ? 'border-brand bg-brand-tint' : 'border-line bg-card hover:border-brand')}
    >
      <span className="block text-sm text-ink-soft">{label}</span>
      <span className="mt-1 block text-2xl font-semibold text-ink">{value === undefined ? '…' : formatINR(value)}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </button>
  )

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card('', 'All expenses', t?.all, 'Direct + indirect (assets not counted)')}
        {card('DIRECT', 'Direct (stitching / making)', t?.direct, 'Per-piece pay, job costs, thread …')}
        {card('INDIRECT', 'Indirect (shop running)', t?.indirect, 'All salary, rent, electricity, tea …')}
        {card('ASSET', 'Assets bought', t?.assets, 'AC, machines … the shop owns — not a cost')}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input icon={IconSearch} aria-label="Search expenses" placeholder="Expense, name, note or number" value={search} onChange={(e) => onSearch(e.target.value)} className="md:w-96" />
        <ExportButton path="/finance/costs/export" params={{ from, to, order, kind: kind || undefined, search: q || undefined }} />
      </div>
      <Card bodyClassName="p-0">
        {all.error ? (
          <EmptyState title="Couldn't load expenses" description={all.error} action={<Button onClick={all.reload}>Try again</Button>} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.key}
            loading={all.loading}
            emptyTitle="No expenses for these dates"
            emptyDescription="Typed expenses (rent, electricity …) and salary, worker pay, job costs show here."
            onRowClick={(r) => { const to = link(r); if (to) navigate(to) }}
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Salary, per-piece worker pay and job costs come in automatically — only rent, electricity, tea … are typed with "Add expense". Buying stock is not an expense (it counts when the item is sold); assets (AC, machines) are what the shop owns — in the Balance sheet, not profit.</p>
    </>
  )
}
