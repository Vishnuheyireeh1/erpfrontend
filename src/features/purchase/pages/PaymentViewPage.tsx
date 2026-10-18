import { IconArrowLeft, IconBan } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { paymentModeLabels, purchaseApi } from '../api/purchase.api'
import { CancelDocModal } from '../components/CancelDocModal'

// /purchase/payments/:id — one supplier payment and the bills it settled.
export function PaymentViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['payment', id], () => purchaseApi.payment(id))
  const [cancelling, setCancelling] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this payment" description={q.error} action={<Button onClick={() => navigate('/purchase')}>Purchase</Button>} /></Card>
  const p = q.data ?? q.lastData
  if (!p) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Back
      </button>
      <PageHeader
        title={p.docNo}
        subtitle={`Payment to ${p.supplier.name}`}
        actions={p.status === 'POSTED' && <Button variant="danger" icon={IconBan} onClick={() => setCancelling(true)}>Cancel payment</Button>}
      />
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Status</p><Badge tone={p.status === 'POSTED' ? 'success' : 'neutral'}>{p.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge></div>
          <div><p className="text-xs text-muted">Amount</p><p className="text-base font-semibold">{formatINR(Number(p.amount))}</p></div>
          <div><p className="text-xs text-muted">Paid by</p>{paymentModeLabels[p.mode]}{p.reference ? ` · ${p.reference}` : ''}</div>
          <div><p className="text-xs text-muted">Date</p>{formatDate(p.docDate)}</div>
          <div><p className="text-xs text-muted">Supplier</p><Link to={`/suppliers/${p.supplier.id}`} className="text-brand hover:underline">{p.supplier.name}</Link></div>
          <div><p className="text-xs text-muted">Against bills</p>{formatINR(p.allocated ?? 0)}</div>
          <div><p className="text-xs text-muted">Advance</p>{formatINR(p.advance ?? 0)}</div>
          {p.notes && <div><p className="text-xs text-muted">Notes</p>{p.notes}</div>}
          {p.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {p.cancelReason}</div>}
        </div>
      </Card>
      <Card title="Bills settled">
        {(p.allocations ?? []).length === 0 ? (
          <p className="text-sm text-muted">Not linked to any bill — the full amount is an advance.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {p.allocations!.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <Link to={`/purchase/${a.invoice.id}`} className="text-brand hover:underline">{a.invoice.docNo}</Link>
                <span className="text-ink-soft">supplier bill {a.invoice.supplierInvoiceNo}</span>
                <span className="font-medium">{formatINR(Number(a.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {cancelling && (
        <CancelDocModal docNo={p.docNo} effect="The bills it paid become due again." onCancel={(r) => purchaseApi.cancelPayment(p.id, r)} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); q.reload() }} />
      )}
    </>
  )
}
