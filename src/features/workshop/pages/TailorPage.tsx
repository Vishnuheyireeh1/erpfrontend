import { IconArrowLeft, IconCash, IconPencil } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { payTypeLabels, tailorApi } from '../api/workshop.api'
import { TailorPaymentModal } from '../components/TailorPaymentModal'
import type { TailorStatementRow } from '../types'
import { SortSwitch } from '@/components/ui/DateRange'
import { inOrder, useListOrder } from '@/lib/useListOrder'

const balanceText = (b: number) =>
  Math.abs(b) < 0.005 ? <span className="text-muted">Settled</span> : b > 0 ? <span className="font-medium text-warn">{formatINR(b)} to pay</span> : <span className="font-medium text-success">{formatINR(-b)} advance</span>

const columns: Column<TailorStatementRow>[] = [
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.date) },
  {
    key: 'doc',
    header: 'Document',
    mobile: 'title',
    render: (r) => (r.type === 'WORK' ? <Link to={r.kind === 'PRD' ? `/production/${r.id}` : r.kind === 'BRD' ? `/brand-orders/${r.id}` : `/jobs/${r.id}`} className="font-medium text-brand hover:underline">{r.docNo}</Link> : <span className="font-medium text-ink">{r.docNo}</span>),
  },
  { key: 'type', header: 'Type', mobile: 'badge', render: (r) => <Badge tone={r.type === 'WORK' ? 'info' : 'success'}>{r.type === 'WORK' ? 'Work' : 'Paid'}</Badge> },
  { key: 'detail', header: 'Details', mobile: 'hidden', render: (r) => <span className="text-ink-soft">{r.detail}</span> },
  { key: 'earned', header: 'Earned', align: 'right', render: (r) => (r.earned ? formatINR(r.earned) : '') },
  { key: 'paid', header: 'Paid', align: 'right', render: (r) => (r.paid ? formatINR(r.paid) : '') },
  { key: 'balance', header: 'Balance', align: 'right', render: (r) => balanceText(r.balance) },
]

// /tailors/:id — one worker: work done (from Ready jobs — stitching and other job work), payments and balance.
// The person's details are edited in Staff & salary.
export function TailorPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['tailor-statement', id], () => tailorApi.statement(id))
  const [order, setOrder] = useListOrder('worker-statement')
  const [modal, setModal] = useState<'' | 'pay'>('')

  if (q.error) return <Card><EmptyState title="Couldn't open this worker" description={q.error} action={<Button onClick={() => navigate('/tailors?tab=active')}>All workers</Button>} /></Card>
  const data = q.data ?? q.lastData
  if (!data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const t = data.tailor
  const piece = t.payType === 'PIECE'
  const done = () => { setModal(''); q.reload() }

  return (
    <>
      <button type="button" onClick={() => navigate('/tailors?tab=active')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Job work
      </button>
      <PageHeader
        title={t.name}
        subtitle={`${t.code} · ${payTypeLabels[t.payType]}${t.speciality ? ` · ${t.speciality}` : ''}${t.phone ? ` · ${t.phone}` : ''}${t.isActive ? '' : ' · Inactive'}`}
        actions={
          <>
            <ExportButton path={`/tailors/${t.id}/statement/export`} label="Statement" />
            {t.staffId && <Button icon={IconPencil} onClick={() => navigate(`/employees?edit=${t.staffId}`)}>Edit (Staff)</Button>}
            {piece && <Button variant="primary" icon={IconCash} onClick={() => setModal('pay')}>Pay worker</Button>}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {piece ? (
          <StatCard label="To pay now" value={formatINR(Math.abs(data.closing))} note={data.closing > 0.004 ? 'Shop has to pay' : data.closing < -0.004 ? 'Advance given' : 'All paid'} noteTone={data.closing > 0.004 ? 'warn' : 'success'} />
        ) : (
          <StatCard label="Pay" value="Salaried" note="Job pay is only used for job cost" />
        )}
        <StatCard label="Pay earned" value={formatINR(data.totals.earned)} note={`Opening ${formatINR(data.opening)}`} />
        <StatCard label="Paid" value={formatINR(data.totals.paid)} />
        <StatCard label="Pieces done" value={String(data.totals.pieces)} />
      </div>
      <Card title="Statement" bodyClassName="p-0" actions={<SortSwitch order={order} onOrder={setOrder} />}>
        <DataTable
          columns={columns}
          rows={inOrder(data.rows, order, 'oldest')}
          rowKey={(r) => `${r.type}-${r.id}`}
          emptyTitle="No work yet"
          emptyDescription="Pay counts when a job they worked on is marked Ready."
        />
        {piece && (
          <div className="flex justify-between border-t border-line bg-page px-4 py-3 text-sm">
            <span className="font-medium text-ink">Balance now</span>
            {balanceText(data.closing)}
          </div>
        )}
      </Card>
      {modal === 'pay' && <TailorPaymentModal tailor={{ ...t, balance: data.closing }} onClose={() => setModal('')} onSaved={done} />}
    </>
  )
}
