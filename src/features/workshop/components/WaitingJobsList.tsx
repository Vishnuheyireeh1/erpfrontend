import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { jobsApi } from '@/features/jobs/api/jobs.api'
import { statusLabels, statusTones } from '@/features/jobs/jobUtils'
import type { JobSummary } from '@/features/jobs/types'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'

const columns: Column<JobSummary>[] = [
  { key: 'job', header: 'Job', mobile: 'title', render: (j) => <span className="font-medium text-brand">{j.docNo}</span> },
  { key: 'customer', header: 'Customer', mobile: 'subtitle', render: (j) => j.customerName },
  {
    key: 'garments', header: 'Garments',
    render: (j) => (
      <span className="flex flex-col">
        {j.items.map((i, n) => <span key={n} className={i.tailor ? 'text-ink-soft' : 'font-medium text-warn'}>{i.qty} × {i.description} — {i.tailor?.name ?? 'no tailor yet'}</span>)}
      </span>
    ),
  },
  { key: 'ready', header: 'Ready by', render: (j) => <span className={j.overdue ? 'font-medium text-danger' : ''}>{formatDate(j.expectedDate)}</span> },
  { key: 'stage', header: 'Stage', mobile: 'badge', render: (j) => <Badge tone={j.overdue ? 'danger' : statusTones[j.status]}>{statusLabels[j.status]}</Badge> },
]

// Job work → "Waiting for workers": jobs billed at the counter whose garments have no tailor yet.
// Tap one → its job page opens with "Assign workers".
export function WaitingJobsList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const q = useApiQuery(['jobs-unassigned', page], () => jobsApi.list({ view: 'unassigned', page }))
  return (
    <Card bodyClassName="p-0">
      {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
        <>
          <DataTable
            startIndex={(page - 1) * 20 + 1}
            columns={columns}
            rows={q.data?.items ?? []}
            rowKey={(j) => j.id}
            loading={q.loading}
            emptyTitle="Every job has its workers"
            emptyDescription="New stitching jobs from Billing appear here until a tailor is given to each garment."
            onRowClick={(j) => navigate(`/jobs/${j.id}?assign=1`)}
          />
          {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
        </>
      )}
    </Card>
  )
}
