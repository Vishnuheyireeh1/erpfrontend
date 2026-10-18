import { IconArrowLeft, IconBan } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { qtyText } from '@/features/inventory/constants'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { salesApi } from '../api/sales.api'

// /sales/returns/:id — goods a customer brought back.
export function SalesReturnViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['sales-return', id], () => salesApi.salesReturn(id))
  const [cancelling, setCancelling] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this return" description={q.error} action={<Button onClick={() => navigate('/sales')}>Sales</Button>} /></Card>
  const r = q.data ?? q.lastData
  if (!r) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const src = (r.invoice ?? r.job)!
  const docLink = r.invoice ? `/sales/${r.invoice.id}` : `/jobs/${r.job!.id}`
  const credit = Number(r.grandTotal) - Number(r.refundAmount) - Number(r.billCleared)

  return (
    <>
      <button type="button" onClick={() => navigate(docLink)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {src.docNo}
      </button>
      <PageHeader
        title={r.docNo}
        subtitle={`Goods returned by ${src.customerName}`}
        actions={r.status === 'POSTED' && <Button variant="danger" icon={IconBan} onClick={() => setCancelling(true)}>Cancel return</Button>}
      />
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p><Badge tone={r.status === 'POSTED' ? 'success' : 'neutral'}>{r.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge></div>
          <div><p className="text-xs text-muted">Return value</p><p className="text-base font-semibold">{formatINR(Number(r.grandTotal))}</p></div>
          <div><p className="text-xs text-muted">Date</p>{formatDate(r.docDate)}</div>
          <div><p className="text-xs text-muted">{r.invoice ? 'Bill' : 'Stitching job'}</p><Link to={docLink} className="text-brand hover:underline">{src.docNo}</Link></div>
          <div>
            <p className="text-xs text-muted">Refunded</p>
            {Number(r.refundAmount) > 0 ? `${formatINR(Number(r.refundAmount))} by ${paymentModeLabels[r.refundMode!]}` : 'Nothing paid back'}
          </div>
          <div><p className="text-xs text-muted">Cleared on this {r.invoice ? 'bill' : 'job'}</p>{formatINR(Number(r.billCleared))}</div>
          {credit > 0.004 && <div><p className="text-xs text-muted">Credit</p>{formatINR(credit)}{Number(r.creditUsed) > 0 ? ` · ${formatINR(Number(r.creditUsed))} used` : ' · not used yet'}</div>}
          <div className="col-span-2"><p className="text-xs text-muted">Reason</p>{r.reason}</div>
          {r.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {r.cancelReason}</div>}
        </div>
      </Card>
      <Card title="Items returned">
        <ul className="flex flex-col gap-2 text-sm">
          {r.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ink">{l.description}</span>
              <span className="shrink-0 text-ink-soft">{qtyText(l.qty)}</span>
              <span className="shrink-0 font-medium">{formatINR(Number(l.total))}</span>
            </li>
          ))}
        </ul>
      </Card>
      {cancelling && (
        <CancelDocModal docNo={r.docNo} effect="The items go out of stock again and the bill's balance goes back up." onCancel={(reason) => salesApi.cancelReturn(r.id, reason)} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); q.reload() }} />
      )}
    </>
  )
}
