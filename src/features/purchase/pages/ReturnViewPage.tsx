import { IconArrowLeft, IconBan } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import { api } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { purchaseApi } from '../api/purchase.api'
import { CancelDocModal } from '../components/CancelDocModal'

type Ret = {
  id: number
  docNo: string
  docDate: string
  reason: string
  status: 'POSTED' | 'CANCELLED'
  taxableTotal: string
  taxTotal: string
  grandTotal: string
  cancelReason: string | null
  supplier: { id: number; name: string }
  invoice: { id: number; docNo: string; supplierInvoiceNo: string }
  lines: { id: number; qty: string; total: string; variant: { sku: string; size: { name: string } | null; colour: { name: string } | null; product: { name: string; unit: { code: string } } } }[]
}

// /purchase/returns/:id — goods sent back to a supplier (debit note).
export function ReturnViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['return', id], () => api.get<{ item: Ret }>(`/purchase-returns/${id}`).then((r) => r.item))
  const [cancelling, setCancelling] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this return" description={q.error} action={<Button onClick={() => navigate('/purchase')}>Purchase</Button>} /></Card>
  const r = q.data ?? q.lastData
  if (!r) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Back
      </button>
      <PageHeader
        title={r.docNo}
        subtitle={`Goods returned to ${r.supplier.name}`}
        actions={r.status === 'POSTED' && <Button variant="danger" icon={IconBan} onClick={() => setCancelling(true)}>Cancel return</Button>}
      />
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p><Badge tone={r.status === 'POSTED' ? 'success' : 'neutral'}>{r.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge></div>
          <div><p className="text-xs text-muted">Against bill</p><Link to={`/purchase/${r.invoice.id}`} className="text-brand hover:underline">{r.invoice.docNo}</Link></div>
          <div><p className="text-xs text-muted">Date</p>{formatDate(r.docDate)}</div>
          <div><p className="text-xs text-muted">Total (incl. GST {formatINR(Number(r.taxTotal))})</p><p className="text-base font-semibold">{formatINR(Number(r.grandTotal))}</p></div>
          <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Reason</p>{r.reason}</div>
          {r.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {r.cancelReason}</div>}
        </div>
      </Card>
      <Card title="Items returned">
        <ul className="flex flex-col gap-2 text-sm">
          {r.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{itemTitle(l.variant)}</span>
              <span className="text-ink-soft">{qtyText(l.qty, l.variant.product.unit.code)}</span>
              <span className="font-medium">{formatINR(Number(l.total))}</span>
            </li>
          ))}
        </ul>
      </Card>
      {cancelling && (
        <CancelDocModal docNo={r.docNo} effect="The items come back into stock and the bill's due goes up again." onCancel={(reason) => purchaseApi.cancelReturn(r.id, reason)} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); q.reload() }} />
      )}
    </>
  )
}
