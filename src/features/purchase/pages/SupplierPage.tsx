import { IconArrowLeft, IconCash, IconPencil, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { supplierApi } from '../api/purchase.api'
import { PaymentModal } from '../components/PaymentModal'
import { SupplierFormModal } from '../components/SupplierFormModal'
import type { StatementRow } from '../types'
import { BalanceText } from './SuppliersPage'
import { SortSwitch } from '@/components/ui/DateRange'
import { inOrder, useListOrder } from '@/lib/useListOrder'

const docLink = (r: StatementRow) => (r.type === 'BILL' ? `/purchase/${r.id}` : r.type === 'PAYMENT' ? `/purchase/payments/${r.id}` : `/purchase/returns/${r.id}`)
const typeLabel = { BILL: 'Bill', PAYMENT: 'Payment', RETURN: 'Return' }

const columns: Column<StatementRow>[] = [
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.date) },
  { key: 'doc', header: 'Document', mobile: 'title', render: (r) => <Link to={docLink(r)} className="font-medium text-brand hover:underline">{r.docNo}</Link> },
  { key: 'type', header: 'Type', mobile: 'badge', render: (r) => <Badge tone={r.type === 'BILL' ? 'info' : 'success'}>{typeLabel[r.type]}</Badge> },
  { key: 'detail', header: 'Details', mobile: 'hidden', render: (r) => <span className="text-ink-soft">{r.detail}</span> },
  { key: 'credit', header: 'Bill amount', align: 'right', render: (r) => (r.credit ? formatINR(r.credit) : '') },
  { key: 'debit', header: 'Paid / returned', align: 'right', render: (r) => (r.debit ? formatINR(r.debit) : '') },
  { key: 'balance', header: 'Balance', align: 'right', render: (r) => <BalanceText balance={r.balance} /> },
]

// /suppliers/:id — details, balance and full statement.
export function SupplierPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['statement', id], () => supplierApi.statement(id))
  const [order, setOrder] = useListOrder('supplier-statement')
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this supplier" description={q.error} action={<Button onClick={() => navigate('/suppliers')}>All suppliers</Button>} /></Card>
  const data = q.data ?? q.lastData
  if (!data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const s = data.supplier

  return (
    <>
      <button type="button" onClick={() => navigate('/suppliers')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Suppliers
      </button>
      <PageHeader
        title={s.name}
        subtitle={`${s.code}${s.gstin ? ` · GSTIN ${s.gstin}` : ' · not GST registered'} · ${s.stateName}${s.isActive ? '' : ' · Inactive'}`}
        actions={
          <>
            <ExportButton path={`/suppliers/${s.id}/statement/export`} label="Statement" />
            <Button icon={IconPencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button icon={IconCash} onClick={() => setPaying(true)}>Pay supplier</Button>
            {s.isActive && <Button variant="primary" icon={IconPlus} onClick={() => navigate(`/purchase/new?supplier=${s.id}`)}>New bill</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Balance" value={formatINR(Math.abs(s.balance))} note={s.balance > 0.004 ? 'You owe them' : s.balance < -0.004 ? 'Advance / they owe you' : 'Settled'} noteTone={s.balance > 0.004 ? 'warn' : 'success'} />
        <StatCard label="Total billed" value={formatINR(s.billed ?? 0)} note={`Opening ${formatINR(Number(s.openingBalance))}`} />
        <StatCard label="Total paid" value={formatINR(s.paid ?? 0)} />
        <StatCard label="Returned" value={formatINR(s.returned ?? 0)} />
      </div>

      {(s.phone || s.address || s.contactPerson) && (
        <Card className="mb-5">
          <p className="text-sm text-ink-soft">
            {[s.contactPerson, s.phone, s.email, [s.address, s.city, s.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </p>
        </Card>
      )}

      <Card title="Statement" bodyClassName="p-0" actions={<SortSwitch order={order} onOrder={setOrder} />}>
        <div className="flex justify-between border-b border-line bg-page px-4 py-2 text-sm">
          <span className="text-muted">Opening balance</span>
          <BalanceText balance={data.opening} />
        </div>
        <DataTable
          columns={columns}
          rows={inOrder(data.rows, order, 'oldest')}
          rowKey={(r) => `${r.type}-${r.id}`}
          emptyTitle="No bills or payments yet"
          emptyDescription="Purchase bills, payments and returns for this supplier appear here."
        />
        <div className="flex justify-between border-t border-line bg-page px-4 py-3 text-sm">
          <span className="font-medium text-ink">Closing balance</span>
          <BalanceText balance={data.closing} />
        </div>
      </Card>

      {editing && <SupplierFormModal key={s.id} supplier={s} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); q.reload() }} />}
      {paying && <PaymentModal supplierId={s.id} supplierName={s.name} onClose={() => setPaying(false)} onSaved={() => { setPaying(false); q.reload() }} />}
    </>
  )
}
