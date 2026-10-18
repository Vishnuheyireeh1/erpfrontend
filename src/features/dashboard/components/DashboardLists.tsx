import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { statusLabels, statusTones } from '@/features/jobs/jobUtils'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import type { Dashboard } from '@/features/reports/types'

const more = (to: string, label = 'View all') => <Link to={to} className="text-sm font-medium text-brand hover:underline">{label}</Link>
const empty = (text: string) => <p className="px-4 py-6 text-center text-sm text-muted">{text}</p>

// Jobs promised within the next 7 days (and late ones), soonest first.
export function DueJobsCard({ jobs }: { jobs: Dashboard['jobs']['due'] }) {
  return (
    <Card title="Jobs due this week" bodyClassName="p-0" actions={more('/jobs')}>
      {jobs.length === 0 ? empty('Nothing due in the next 7 days.') : (
        <ul className="divide-y divide-line">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-page">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{j.customer}</span>
                  <span className="block truncate text-xs text-muted">{j.docNo} · {j.garments}{j.tailors ? ` · ${j.tailors}` : ''}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={j.overdue ? 'warn' : statusTones[j.status]}>{j.overdue ? 'Late' : statusLabels[j.status]}</Badge>
                  <span className={cn('text-xs', j.overdue ? 'font-medium text-danger' : 'text-muted')}>{formatDate(j.expectedDate)}</span>
                  {j.balance > 0 && <span className="text-xs text-warn">Due {formatINR(j.balance)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Below "Jobs due this week": latest jobs with no tailor / no pay entered — tap → the job opens on "Assign workers".
export function NoCostJobsCard({ data }: { data: Dashboard['noCost'] }) {
  return (
    <Card title={`Job cost not added yet${data.count ? ` (${data.count})` : ''}`} bodyClassName="p-0" actions={data.count > 0 && more('/tailors')}>
      {data.items.length === 0 ? empty('Every recent job has its tailor and pay entered.') : (
        <ul className="divide-y divide-line">
          {data.items.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}?assign=1`} className="flex items-start gap-3 px-4 py-3 hover:bg-page">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{j.customer}</span>
                  <span className="block truncate text-xs text-muted">{j.docNo} · {j.garments} · booked {formatDate(j.docDate)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone="warn">{j.reason}</Badge>
                  <span className="text-xs font-medium text-brand">Add now →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function LowStockCard({ low }: { low: Dashboard['lowStock'] }) {
  return (
    <Card title={`Low stock${low.count ? ` (${low.count})` : ''}`} bodyClassName="p-0" actions={low.count > 0 && more('/stock?status=low')}>
      {low.items.length === 0 ? empty('No item is below its alert level.') : (
        <ul className="divide-y divide-line">
          {low.items.map((i) => (
            <li key={i.variantId}>
              <Link to={`/stock/items/${i.variantId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-page">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{i.name}</span>
                  <span className="block truncate text-xs text-muted">{i.sku}</span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className={i.stock <= 0 ? 'font-medium text-danger' : 'font-medium text-warn'}>{i.stock}</span>
                  <span className="text-xs text-muted"> / min {i.min}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function TopItemsCard({ items }: { items: Dashboard['topItems'] }) {
  return (
    <Card title="Best sellers this month" bodyClassName="p-0" actions={more('/reports?tab=items')}>
      {items.length === 0 ? empty('No sales yet this month.') : (
        <ul className="divide-y divide-line">
          {items.map((i, idx) => (
            <li key={i.productId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand">{idx + 1}</span>
              <Link to={`/products/${i.productId}`} className="min-w-0 flex-1 truncate text-sm text-ink hover:text-brand">{i.name}</Link>
              <span className="shrink-0 text-right text-sm">
                <span className="block font-medium text-ink">{formatINR(i.amount)}</span>
                <span className="block text-xs text-muted">{i.qty} sold</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
