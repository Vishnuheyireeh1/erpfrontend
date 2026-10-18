import { IconArrowLeft, IconCash, IconFileSpreadsheet, IconNeedleThread, IconPencil, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { MoreMenu } from '@/components/ui/MoreMenu'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { customerApi } from '../api/sales.api'
import { CustomerBalance } from '../components/CustomerBalance'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { CustomerOpenJobs } from '../components/CustomerOpenJobs'
import { fetchFile } from '../print/printing'
import { ReceiptModal } from '../components/ReceiptModal'
import { MeasurementsCard } from '@/features/workshop/components/MeasurementsCard'
import type { CustomerStatementRow } from '../types'
import { SortSwitch } from '@/components/ui/DateRange'
import { inOrder, useListOrder } from '@/lib/useListOrder'

const docLink = (r: CustomerStatementRow) =>
  r.type === 'BILL' ? `/sales/${r.id}` : r.type === 'JOB' ? `/jobs/${r.id}` : r.type === 'RECEIPT' ? `/sales/receipts/${r.id}` : `/sales/returns/${r.id}`
const typeInfo = {
  BILL: { label: 'Bill', tone: 'info' as const },
  JOB: { label: 'Job', tone: 'info' as const },
  RECEIPT: { label: 'Received', tone: 'success' as const },
  RETURN: { label: 'Return', tone: 'success' as const },
  REFUND: { label: 'Refund', tone: 'warn' as const },
}

const columns: Column<CustomerStatementRow>[] = [
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.date) },
  { key: 'doc', header: 'Document', mobile: 'title', render: (r) => <Link to={docLink(r)} className="font-medium text-brand hover:underline">{r.docNo}</Link> },
  { key: 'type', header: 'Type', mobile: 'badge', render: (r) => <Badge tone={typeInfo[r.type].tone}>{typeInfo[r.type].label}</Badge> },
  { key: 'detail', header: 'Details', mobile: 'hidden', render: (r) => <span className="text-ink-soft">{r.detail}</span> },
  { key: 'debit', header: 'Bill / refund', align: 'right', render: (r) => (r.debit ? formatINR(r.debit) : '') },
  { key: 'credit', header: 'Received / returned', align: 'right', render: (r) => (r.credit ? formatINR(r.credit) : '') },
  { key: 'balance', header: 'Balance', align: 'right', render: (r) => <CustomerBalance balance={r.balance} /> },
]

// /customers/:id — details, balance and full statement.
export function CustomerPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['customer-statement', id], () => customerApi.statement(id))
  const [order, setOrder] = useListOrder('customer-statement')
  const [editing, setEditing] = useState(false)
  const [receiving, setReceiving] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this customer" description={q.error} action={<Button onClick={() => navigate('/customers')}>All customers</Button>} /></Card>
  const data = q.data ?? q.lastData
  if (!data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const c = data.customer

  return (
    <>
      <button type="button" onClick={() => navigate('/customers')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Customers
      </button>
      <PageHeader
        title={c.name}
        subtitle={`${c.code}${c.phone ? ` · ${c.phone}` : ''}${c.gstin ? ` · GSTIN ${c.gstin}` : ''}${c.isActive ? '' : ' · Inactive'}`}
        actions={
          <>
            <Button icon={IconCash} onClick={() => setReceiving(true)}>Receive money</Button>
            {c.isActive && <Button icon={IconPlus} onClick={() => navigate(`/billing?customer=${c.id}`)}>New shop bill</Button>}
            {c.isActive && <Button variant="primary" icon={IconNeedleThread} onClick={() => navigate(`/billing?kind=job&customer=${c.id}`)}>New stitching job</Button>}
            <MoreMenu items={[
              { label: 'Edit customer', icon: IconPencil, onClick: () => setEditing(true) },
              { label: 'Download statement (Excel)', icon: IconFileSpreadsheet, onClick: () => { void fetchFile(`/customers/${c.id}/statement/export`) } },
            ]} />
          </>
        }
      />

      <CustomerOpenJobs customerId={c.id} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Balance" value={formatINR(Math.abs(c.balance))} note={c.balance > 0.004 ? 'To collect' : c.balance < -0.004 ? 'Advance / credit held' : 'Settled'} noteTone={c.balance > 0.004 ? 'warn' : 'success'} />
        <StatCard label="Total billed" value={formatINR(c.billed ?? 0)} note={Number(c.openingBalance) < 0 ? `Advance before software ${formatINR(-Number(c.openingBalance))}` : Number(c.openingBalance) > 0 ? `Old balance ${formatINR(Number(c.openingBalance))}` : undefined} />
        <StatCard label="Received" value={formatINR(c.received ?? 0)} />
        <StatCard label="Returned" value={formatINR(c.returned ?? 0)} note={c.refunded ? `Refunded ${formatINR(c.refunded)}` : undefined} />
      </div>

      {(c.address || c.email || c.notes) && (
        <Card className="mb-5">
          <p className="text-sm text-ink-soft">{[c.email, [c.address, c.city, c.pincode].filter(Boolean).join(', '), c.notes].filter(Boolean).join(' · ')}</p>
        </Card>
      )}

      <MeasurementsCard customerId={c.id} customerName={c.name} />

      <Card title="Statement" bodyClassName="p-0" actions={<SortSwitch order={order} onOrder={setOrder} />}>
        <div className="flex justify-between border-b border-line bg-page px-4 py-2 text-sm">
          <span className="text-muted">Earlier balance / advance</span>
          <CustomerBalance balance={data.opening} />
        </div>
        <DataTable
          columns={columns}
          rows={inOrder(data.rows, order, 'oldest')}
          rowKey={(r) => `${r.type}-${r.id}`}
          emptyTitle="No bills yet"
          emptyDescription="Bills, money received and returns for this customer appear here."
        />
        <div className="flex justify-between border-t border-line bg-page px-4 py-3 text-sm">
          <span className="font-medium text-ink">Closing balance</span>
          <CustomerBalance balance={data.closing} />
        </div>
      </Card>

      {editing && <CustomerFormModal key={c.id} customer={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); q.reload() }} />}
      {receiving && <ReceiptModal customerId={c.id} customerName={c.name} onClose={() => setReceiving(false)} onSaved={() => { setReceiving(false); q.reload() }} />}
    </>
  )
}
