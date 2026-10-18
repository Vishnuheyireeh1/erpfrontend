import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatDate, formatINR } from '@/lib/format'

export type JobProfitRow = {
  id: number
  docNo: string
  docDate: string
  customerName: string
  status: string
  charged: number
  labour: number
  other: number
  material: number
  cost: number
  profit: number
  marginPct: number
}

const stage = (s: string) => (s === 'DELIVERED' ? <Badge tone="brand">Handed over</Badge> : s === 'READY' ? <Badge tone="success">Ready</Badge> : <Badge tone="pending">In work</Badge>)

const columns: Column<JobProfitRow>[] = [
  { key: 'docNo', header: 'Job', mobile: 'title', render: (j) => <span className="font-medium text-brand">{j.docNo}</span> },
  { key: 'customer', header: 'Customer', mobile: 'subtitle', render: (j) => `${j.customerName} · ${formatDate(j.docDate)}` },
  { key: 'stage', header: 'Stage', render: (j) => stage(j.status) },
  { key: 'charged', header: 'Stitching charged', align: 'right', render: (j) => formatINR(j.charged) },
  { key: 'labour', header: 'Tailor pay', align: 'right', render: (j) => formatINR(j.labour) },
  { key: 'other', header: 'Job costs', align: 'right', render: (j) => formatINR(j.other) },
  { key: 'material', header: 'Cloth given free', align: 'right', render: (j) => formatINR(j.material) },
  {
    key: 'profit',
    header: 'Profit',
    align: 'right',
    mobile: 'badge',
    render: (j) => <span className={j.profit < 0 ? 'font-semibold text-danger' : 'font-semibold text-success'}>{formatINR(j.profit)}</span>,
  },
  { key: 'margin', header: 'Margin', align: 'right', render: (j) => <span className={j.marginPct < 0 ? 'text-danger' : 'text-muted'}>{j.marginPct}%</span> },
]

// Workshop reports → "Profit of each job": lowest profit first, losses in red. A row opens the job.
export function JobProfitList({ rows, loading }: { rows: JobProfitRow[]; loading: boolean }) {
  const navigate = useNavigate()
  const losses = rows.filter((j) => j.profit < 0).length
  return (
    <Card
      title={`Profit of each job (${rows.length})`}
      actions={losses > 0 ? <Badge tone="danger">{losses} at a loss</Badge> : undefined}
      bodyClassName="p-0"
      className="mb-6"
    >
      <DataTable columns={columns} rows={rows} rowKey={(j) => j.id} loading={loading} emptyTitle="No jobs in this period" onRowClick={(j) => navigate(`/jobs/${j.id}`)} />
      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        Lowest profit first. Profit = stitching charged (before GST) − tailor pay − other work (cutting, embroidery…) − cloth given free. Items the customer paid for are a shop sale, not counted here.
      </p>
    </Card>
  )
}
