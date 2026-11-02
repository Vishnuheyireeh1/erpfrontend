import { IconArrowLeft, IconBan, IconCash, IconPencil, IconPrinter, IconProgress, IconTruckDelivery } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { MoreMenu } from '@/components/ui/MoreMenu'
import { printText } from '@/features/sales/print/printing'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { dueText } from '@/features/jobs/jobUtils'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandOrderApi } from '../api/brandOrder.api'
import { BrandAssignModal } from '../components/BrandAssignModal'
import { BrandClothCard } from '../components/BrandClothCard'
import { BrandCostsCard } from '../components/BrandCostsCard'
import { BrandMaterialsModal } from '../components/BrandMaterialsModal'
import { BrandMoneyCard } from '../components/BrandMoneyCard'
import { BrandNextStep } from '../components/BrandNextStep'
import { BrandPaymentModal } from '../components/BrandPaymentModal'
import { BrandPiecesCard } from '../components/BrandPiecesCard'
import { BrandStageModal } from '../components/BrandStageModal'
import { DeliverModal } from '../components/DeliverModal'
import { OrderBillsCard } from '../components/OrderBillsCard'
import { brandOrderBillText } from '../print/brandOrderBillText'
import { gstLabel, type BrandPiece } from '../types'

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

// /brand-orders/:id — works like a stitching job page: the day-to-day steps as buttons (Receive money, Change stage,
// Hand over), everything else under More; what to do next on top; the order's money on the right.
export function BrandOrderViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['brand-order', id], () => brandOrderApi.get(id))
  const { profile, settings } = useBusinessProfile()
  const [modal, setModal] = useState<'' | 'cancel' | 'deliver' | 'receive' | 'stage' | 'assign'>('')
  const [itemsFor, setItemsFor] = useState<BrandPiece | null>(null)

  if (q.error) return <Card><EmptyState title="Couldn't open this order" description={q.error} action={<Button onClick={() => navigate('/brand-orders')}>All brand orders</Button>} /></Card>
  const order = q.data ?? q.lastData
  if (!order) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const open = order.status === 'OPEN'
  const late = open && order.expectedDate.slice(0, 10) < todayIST()
  const statusBadge = order.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : order.status === 'COMPLETED' ? <Badge tone="info">Delivered</Badge> : late ? <Badge tone="danger">Late</Badge> : <Badge tone="pending">In progress</Badge>
  const piecesLeft = order.inWork + order.ready > 0
  const done = () => { setModal(''); q.reload() }
  const print = () => { if (profile && settings) printText(brandOrderBillText(order, profile, settings['billing.print'].columns), settings['billing.print']) }
  const showCloth = order.items.some((i) => i.brandCloth) || order.clothEntries.length > 0

  return (
    <>
      <button type="button" onClick={() => navigate('/brand-orders')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Brand orders
      </button>
      <PageHeader
        title={order.docNo}
        subtitle={`${order.brandName}${order.theirOrderNo ? ` · order / bill no. ${order.theirOrderNo}` : ''} · received ${formatDate(order.docDate)}`}
        actions={
          <>
            {order.status !== 'CANCELLED' && order.balance > 0.004 && <Button icon={IconCash} onClick={() => setModal('receive')}>Receive money</Button>}
            {open && piecesLeft && <Button icon={IconProgress} onClick={() => setModal('stage')}>Change stage</Button>}
            {open && piecesLeft && <Button icon={IconTruckDelivery} onClick={() => setModal('deliver')}>Hand over</Button>}
            <MoreMenu items={[
              { label: 'Print order bill', icon: IconPrinter, onClick: print },
              { label: 'Edit order', icon: IconPencil, onClick: () => navigate(`/brand-orders/${order.id}/edit`), hidden: !open },
              { label: 'Cancel order', icon: IconBan, onClick: () => setModal('cancel'), danger: true, hidden: !open || order.delivered > 0 },
            ]} />
          </>
        }
      />

      <BrandNextStep order={order} onAssign={() => setModal('assign')} onStage={() => setModal('stage')} onHandOver={() => setModal('deliver')} onReceive={() => setModal('receive')} />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p>{statusBadge}</div>
          <div>
            <p className="text-xs text-muted">Due</p>
            <p className={cn(late && 'font-medium text-danger')}>{formatDate(order.expectedDate)}{open ? ` · ${dueText(order.expectedDate, true)}` : ''}</p>
          </div>
          <div><p className="text-xs text-muted">Brand</p><p>{order.brand.name}<span className="block text-xs text-muted">{order.brand.phone ?? ''}{order.brand.phone ? ' · ' : ''}{gstLabel(order.brand.gstRate)} usually</span></p></div>
          <div><p className="text-xs text-muted">Pieces</p><p>{order.inWork} in work · <span className="text-success">{order.ready} ready</span> · {order.delivered} handed over</p></div>
          {order.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Notes</p>{order.notes}</div>}
          {order.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ''} — {order.cancelReason}</div>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <BrandPiecesCard order={order} onChanged={q.reload} onAddItems={setItemsFor} onAssign={() => setModal('assign')} />
          <OrderBillsCard order={order} />
          <BrandCostsCard order={order} onChanged={q.reload} onAssign={() => setModal('assign')} />
          {showCloth && <BrandClothCard order={order} onChanged={q.reload} />}
        </div>
        <div className="min-w-0"><BrandMoneyCard order={order} onReceive={() => setModal('receive')} onChanged={q.reload} /></div>
      </div>

      {modal === 'cancel' && (
        <CancelDocModal
          docNo={order.docNo}
          effect={`Stock items of this order go back to stock, and tailor pay for its ready pieces is no longer owed.${order.received > 0 ? ' Money already received stays on the brand\'s account as an advance.' : ''}`}
          onCancel={(reason) => brandOrderApi.cancel(order.id, reason)}
          onClose={() => setModal('')}
          onDone={done}
        />
      )}
      {modal === 'deliver' && <DeliverModal order={order} onClose={() => setModal('')} onDone={(bill) => navigate(`/brand-bills/${bill.id}`)} />}
      {modal === 'receive' && <BrandPaymentModal brandId={order.brandId} brandName={order.brandName} pending={order.balance} orderId={order.id} orderNo={order.docNo} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'stage' && <BrandStageModal order={order} onClose={() => setModal('')} onDone={done} />}
      {modal === 'assign' && <BrandAssignModal order={order} onClose={() => setModal('')} onDone={done} />}
      {itemsFor && <BrandMaterialsModal order={order} piece={itemsFor} onClose={() => setItemsFor(null)} onDone={() => { setItemsFor(null); q.reload() }} />}
    </>
  )
}
