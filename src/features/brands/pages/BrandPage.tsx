import { IconArrowLeft, IconCash, IconPencil, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Tabs'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandApi } from '../api/brand.api'
import { brandOrderApi } from '../api/brandOrder.api'
import { BrandBillsTable, BrandPaymentsTable } from '../components/BrandDocsTables'
import { BrandFormModal } from '../components/BrandFormModal'
import { BrandPaymentModal } from '../components/BrandPaymentModal'
import { BrandStatementTable } from '../components/BrandStatementTable'
import { gstLabel, type BrandOrderSummary } from '../types'

type Tab = 'statement' | 'orders' | 'bills' | 'payments'
const orderCols: Column<BrandOrderSummary>[] = [
  { key: 'doc', header: 'Order', mobile: 'title', render: (o) => <span className="font-medium text-brand">{o.docNo}</span> },
  { key: 'date', header: 'Received', mobile: 'subtitle', render: (o) => `${formatDate(o.docDate)}${o.theirOrderNo ? ` · their ${o.theirOrderNo}` : ''}` },
  { key: 'due', header: 'Due', mobile: 'hidden', render: (o) => formatDate(o.expectedDate) },
  { key: 'pieces', header: 'Pieces', render: (o) => `${o.pieces} (${o.delivered} delivered)` },
  { key: 'value', header: 'Value', align: 'right', render: (o) => formatINR(o.value) },
  { key: 'status', header: '', mobile: 'badge', render: (o) => <Badge tone={o.status === 'OPEN' ? 'pending' : o.status === 'COMPLETED' ? 'info' : 'neutral'}>{o.status === 'OPEN' ? 'In progress' : o.status === 'COMPLETED' ? 'Delivered' : 'Cancelled'}</Badge> },
]

// /brands/:id — one brand: what they owe, statement, orders, delivery bills, money received.
export function BrandPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'statement'
  const [version, setVersion] = useState(0)
  const [modal, setModal] = useState<'' | 'edit' | 'pay'>('')
  const q = useApiQuery(['brand', id, version], () => brandApi.get(id))
  const orders = useApiQuery(['brand-orders-of', id, version], () => (tab === 'orders' ? brandOrderApi.list({ view: 'all', brandId: id }) : Promise.resolve(null)))
  const refresh = () => setVersion((v) => v + 1)

  if (q.error) return <Card><EmptyState title="Couldn't open this brand" description={q.error} action={<Button onClick={() => navigate('/brands')}>All brands</Button>} /></Card>
  const b = q.data ?? q.lastData
  if (!b) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate('/brands')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><IconArrowLeft size={16} /> Brands</button>
      <PageHeader
        title={b.name}
        subtitle={[b.code, b.contactPerson, b.phone, b.gstin ? `GSTIN ${b.gstin}` : 'No GSTIN', gstLabel(b.gstRate) + ' usually'].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button icon={IconPencil} onClick={() => setModal('edit')}>Edit</Button>
            <Button icon={IconPlus} onClick={() => navigate(`/brand-orders/new?brand=${b.id}`)}>New order</Button>
            <Button variant="primary" icon={IconCash} onClick={() => setModal('pay')}>Money received</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Pending (to receive)', formatINR(Math.max(0, b.balance)), b.balance > 0.004 ? 'text-warn' : 'text-success'],
          ['Total billed', formatINR(b.billed ?? 0), ''],
          ['Total received', formatINR(b.paid ?? 0), 'text-success'],
          ['Opening balance', formatINR(Number(b.openingBalance)), ''],
        ].map(([label, value, tone]) => (
          <Card key={label}><p className="text-xs text-muted">{label}</p><p className={`text-xl font-semibold ${tone}`}>{value}</p>{label.startsWith('Pending') && b.balance < -0.004 && <p className="text-xs text-success">Advance {formatINR(-b.balance)}</p>}</Card>
        ))}
      </div>
      <div className="mb-4">
        <Tabs tabs={[{ key: 'statement', label: 'Statement' }, { key: 'orders', label: 'Orders' }, { key: 'bills', label: 'Delivery bills' }, { key: 'payments', label: 'Money received' }]} active={tab} onChange={(t) => setParams(t === 'statement' ? {} : { tab: t })} />
      </div>
      <Card bodyClassName="p-0">
        {tab === 'statement' && <BrandStatementTable brandId={b.id} version={version} />}
        {tab === 'orders' && <DataTable columns={orderCols} rows={orders.data?.items ?? []} rowKey={(o) => o.id} loading={orders.loading} emptyTitle="No orders yet" onRowClick={(o) => navigate(`/brand-orders/${o.id}`)} />}
        {tab === 'bills' && <BrandBillsTable brandId={b.id} version={version} />}
        {tab === 'payments' && <BrandPaymentsTable brandId={b.id} version={version} onChanged={refresh} />}
      </Card>
      {modal === 'edit' && <BrandFormModal brand={b} onClose={() => setModal('')} onSaved={(saved) => (saved ? (setModal(''), refresh()) : navigate('/brands'))} />}
      {modal === 'pay' && <BrandPaymentModal brandId={b.id} brandName={b.name} pending={b.balance} onClose={() => setModal('')} onSaved={() => { setModal(''); refresh() }} />}
    </>
  )
}
