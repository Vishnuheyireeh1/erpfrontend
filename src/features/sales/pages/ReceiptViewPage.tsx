import { IconArrowLeft, IconBan } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { salesApi } from '../api/sales.api'

// /sales/receipts/:id — money received and the bills it settled.
export function ReceiptViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['receipt', id], () => salesApi.receipt(id))
  const [cancelling, setCancelling] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this receipt" description={q.error} action={<Button onClick={() => navigate('/sales')}>Sales</Button>} /></Card>
  const r = q.data ?? q.lastData
  if (!r) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Back
      </button>
      <PageHeader
        title={r.docNo}
        subtitle={`Money received from ${r.customer?.name ?? 'cash customer'}`}
        actions={r.status === 'POSTED' && <Button variant="danger" icon={IconBan} onClick={() => setCancelling(true)}>Cancel receipt</Button>}
      />
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p><Badge tone={r.status === 'POSTED' ? 'success' : 'neutral'}>{r.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge></div>
          <div><p className="text-xs text-muted">Amount</p><p className="text-base font-semibold">{formatINR(Number(r.amount))}</p></div>
          <div><p className="text-xs text-muted">Date</p>{formatDate(r.docDate)}</div>
          <div>
            <p className="text-xs text-muted">Customer</p>
            {r.customer ? <Link to={`/customers/${r.customer.id}`} className="text-brand hover:underline">{r.customer.name}</Link> : 'Cash customer'}
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted">Received by</p>
            {r.tenders.map((t, i) => <p key={i}>{paymentModeLabels[t.mode]} {formatINR(Number(t.amount))}{t.reference ? ` · ${t.reference}` : ''}</p>)}
          </div>
          <div><p className="text-xs text-muted">Against bills</p>{formatINR(r.allocated ?? 0)}</div>
          <div><p className="text-xs text-muted">Advance kept</p>{formatINR(r.advance ?? 0)}</div>
          {r.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Notes</p>{r.notes}</div>}
          {r.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {r.cancelReason}</div>}
        </div>
      </Card>
      <Card title="Bills settled">
        {(r.allocations ?? []).length === 0 ? (
          <p className="text-sm text-muted">Not linked to any bill — the full amount is an advance.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {r.allocations!.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                {a.invoice ? (
                  <Link to={`/sales/${a.invoice.id}`} className="text-brand hover:underline">{a.invoice.docNo}</Link>
                ) : (
                  <Link to={`/jobs/${a.job!.id}`} className="text-brand hover:underline">{a.job!.docNo}</Link>
                )}
                <span className="text-ink-soft">{a.invoice ? 'bill' : 'job'} {formatINR(Number((a.invoice ?? a.job)!.grandTotal))}</span>
                <span className="font-medium">{formatINR(Number(a.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {cancelling && (
        <CancelDocModal docNo={r.docNo} effect="The bills it paid become due again." onCancel={(reason) => salesApi.cancelReceipt(r.id, reason)} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); q.reload() }} />
      )}
    </>
  )
}
