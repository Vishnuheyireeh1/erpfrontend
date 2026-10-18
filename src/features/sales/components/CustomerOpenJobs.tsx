import { IconNeedleThread } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { jobsApi } from '@/features/jobs/api/jobs.api'
import { statusLabels, statusTones } from '@/features/jobs/jobUtils'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'

const done = (s: string) => s === 'DELIVERED' || s === 'CANCELLED'

// Customer page, at the top → "Stitching jobs": every job of this customer — the ones still in work first (what is
// ready, what to collect), then the handed-over ones. Tap one → the job page. Nothing shown for shop-only customers.
export function CustomerOpenJobs({ customerId }: { customerId: number }) {
  const q = useApiQuery(['customer-jobs', customerId], () => jobsApi.list({ view: 'all', customerId, page: 1 }))
  const jobs = [...(q.data?.items ?? [])].sort((a, b) => Number(done(a.status)) - Number(done(b.status)))
  if (!jobs.length) return null
  const open = jobs.filter((j) => !done(j.status)).length
  const total = q.data?.total ?? jobs.length
  return (
    <Card title={`Stitching jobs (${total})${open ? ` · ${open} in work` : ''}`} className="mb-5" bodyClassName="p-0">
      <ul className="divide-y divide-line">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link to={`/jobs/${j.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-page ${done(j.status) ? 'opacity-70' : ''}`}>
              <IconNeedleThread size={20} className="shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{j.docNo} · {j.items.map((i) => `${i.qty} × ${i.description}`).join(', ')}</span>
                <span className="block text-xs text-muted">
                  {done(j.status) ? `Booked ${formatDate(j.docDate)}` : `Ready by ${formatDate(j.expectedDate)}`}
                  {j.status === 'CANCELLED' ? '' : j.dueAmount > 0.004 ? ` · to collect ${formatINR(j.dueAmount)}` : ' · fully paid'}
                </span>
              </span>
              <Badge tone={j.overdue ? 'danger' : statusTones[j.status]}>{statusLabels[j.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
