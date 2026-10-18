import { IconArrowLeft, IconBan, IconPencil, IconTruckDelivery } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { MoreMenu } from '@/components/ui/MoreMenu'
import { dueText } from '@/features/jobs/jobUtils'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandOrderApi } from '../api/brandOrder.api'
import { BrandClothCard } from '../components/BrandClothCard'
import { BrandMaterialsModal } from '../components/BrandMaterialsModal'
import { DeliverModal } from '../components/DeliverModal'
import { OrderBillsCard } from '../components/OrderBillsCard'
import { BrandPiecesCard } from '../components/BrandPiecesCard'
import { gstLabel, type BrandPiece } from '../types'

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

// /brand-orders/:id — one brand order: pieces (stage, measurements, tailor, stock items), dates, label note.
export function BrandOrderViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['brand-order', id], () => brandOrderApi.get(id))
  const [modal, setModal] = useState<'' | 'cancel' | 'deliver'>('')
  const [itemsFor, setItemsFor] = useState<BrandPiece | null>(null)

  if (q.error) return <Card><EmptyState title="Couldn't open this order" description={q.error} action={<Button onClick={() => navigate('/brand-orders')}>All brand orders</Button>} /></Card>
  const order = q.data ?? q.lastData
  if (!order) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const open = order.status === 'OPEN'
  const late = open && order.expectedDate.slice(0, 10) < todayIST()
  const statusBadge = order.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : order.status === 'COMPLETED' ? <Badge tone="info">Delivered</Badge> : late ? <Badge tone="danger">Late</Badge> : <Badge tone="pending">In progress</Badge>
  const charged = order.materials.reduce((s, m) => s + Number(m.amount), 0)

  return (
    <>
      <button type="button" onClick={() => navigate('/brand-orders')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Brand orders
      </button>
      <PageHeader
        title={order.docNo}
        subtitle={`${order.brandName}${order.theirOrderNo ? ` · their no. ${order.theirOrderNo}` : ''} · received ${formatDate(order.docDate)}`}
        actions={
          <>
            {open && order.inWork + order.ready > 0 && <Button variant="primary" icon={IconTruckDelivery} onClick={() => setModal('deliver')}>Deliver & bill</Button>}
            {open && <Button icon={IconPencil} onClick={() => navigate(`/brand-orders/${order.id}/edit`)}>Edit order</Button>}
            <MoreMenu items={[{ label: 'Cancel order', icon: IconBan, onClick: () => setModal('cancel'), danger: true, hidden: !open || order.delivered > 0 }]} />
          </>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p>{statusBadge}</div>
          <div>
            <p className="text-xs text-muted">Due</p>
            <p className={cn(late && 'font-medium text-danger')}>{formatDate(order.expectedDate)}{open ? ` · ${dueText(order.expectedDate, true)}` : ''}</p>
          </div>
          <div><p className="text-xs text-muted">Brand</p><p>{order.brand.name}<span className="block text-xs text-muted">{order.brand.phone ?? ''}{order.brand.phone ? ' · ' : ''}{gstLabel(order.brand.gstRate)} usually</span></p></div>
          <div><p className="text-xs text-muted">Entered by</p>{order.createdBy}</div>
          {order.labelNote && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Label / emblem</p>{order.labelNote}</div>}
          {order.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Notes</p>{order.notes}</div>}
          {order.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ''} — {order.cancelReason}</div>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">In work</p><p className="text-lg font-semibold">{order.inWork}</p></div>
          <div><p className="text-xs text-muted">Ready</p><p className="text-lg font-semibold text-success">{order.ready}</p></div>
          <div><p className="text-xs text-muted">Delivered</p><p className="text-lg font-semibold">{order.delivered}</p></div>
          <div>
            <p className="text-xs text-muted">Order value</p>
            <p className="text-lg font-semibold">{formatINR(order.value)}</p>
            {charged > 0 && <p className="text-xs text-muted">incl. stock items {formatINR(charged)}</p>}
          </div>
        </div>
      </Card>

      <BrandPiecesCard order={order} onChanged={q.reload} onAddItems={setItemsFor} />
      <OrderBillsCard order={order} />
      <BrandClothCard order={order} onChanged={q.reload} />

      {modal === 'cancel' && (
        <CancelDocModal
          docNo={order.docNo}
          effect="Stock items of this order go back to stock, and tailor pay for its ready pieces is no longer owed."
          onCancel={(reason) => brandOrderApi.cancel(order.id, reason)}
          onClose={() => setModal('')}
          onDone={() => { setModal(''); q.reload() }}
        />
      )}
      {modal === 'deliver' && <DeliverModal order={order} onClose={() => setModal('')} onDone={(bill) => navigate(`/brand-bills/${bill.id}`)} />}
      {itemsFor && <BrandMaterialsModal order={order} piece={itemsFor} onClose={() => setItemsFor(null)} onDone={() => { setItemsFor(null); q.reload() }} />}
    </>
  )
}
