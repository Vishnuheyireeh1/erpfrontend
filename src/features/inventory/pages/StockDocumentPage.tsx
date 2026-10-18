import { IconArrowLeft, IconBan, IconBarcode } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { inventoryApi } from '../api/inventory.api'
import { itemTitle, qtyText, reasonLabels } from '../constants'
import type { StockDocument } from '../types'

type Line = NonNullable<StockDocument['lines']>[number]

const columns: Column<Line>[] = [
  {
    key: 'item',
    header: 'Item',
    mobile: 'title',
    render: (l) => (
      <Link to={`/stock/items/${l.variant.id}`} className="block min-w-0 hover:underline">
        <span className="block truncate font-medium text-ink">{itemTitle(l.variant)}</span>
        <span className="block font-mono text-xs text-muted">{l.variant.sku}</span>
      </Link>
    ),
  },
  { key: 'qty', header: 'Qty', align: 'right', mobile: 'subtitle', render: (l) => <span className={Number(l.qty) < 0 ? 'text-warn' : 'text-success'}>{Number(l.qty) > 0 ? '+' : ''}{qtyText(l.qty, l.variant.product.unit.code)}</span> },
  { key: 'cost', header: 'Cost / unit', align: 'right', render: (l) => formatINR(Number(l.unitCost)) },
  { key: 'value', header: 'Value', align: 'right', render: (l) => formatINR(Number(l.value)) },
]

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{children}</p>
    </div>
  )
}

// /stock/documents/:id — view one document; cancel = reverse its stock (never delete).
export function StockDocumentPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const q = useApiQuery(id, () => inventoryApi.document(id))
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this document" description={q.error} action={<Button onClick={() => navigate('/stock/documents')}>All documents</Button>} /></Card>
  if (!q.data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const doc = q.data
  const total = Number(doc.totalValue)

  const cancel = async () => {
    if (reason.trim().length < 3) return setError('Enter why it is cancelled')
    setBusy(true)
    try {
      await inventoryApi.cancel(doc.id, reason.trim())
      toast.success(`${doc.docNo} cancelled — stock reversed`)
      setCancelOpen(false)
      q.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/stock/documents')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Stock documents
      </button>
      <PageHeader
        title={doc.docNo}
        subtitle={doc.kind === 'OPENING' ? 'Opening stock' : `Stock adjustment — ${reasonLabels[doc.reason]}`}
        actions={
          doc.status === 'POSTED' && (
            <>
              {doc.lines?.some((l) => Number(l.qty) > 0) && (
                <Button icon={IconBarcode} onClick={() => navigate(`/labels?doc=${doc.id}`)}>Print labels</Button>
              )}
              <Button variant="danger" icon={IconBan} onClick={() => { setCancelOpen(true); setError(''); setReason('') }}>Cancel document</Button>
            </>
          )
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Info label="Status"><Badge tone={doc.status === 'POSTED' ? 'success' : 'neutral'}>{doc.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge></Info>
          <Info label="Date">{formatDate(doc.docDate)}</Info>
          <Info label="Value">{total < 0 ? '−' : ''}{formatINR(Math.abs(total))}</Info>
          <Info label="Saved by">{doc.createdBy} · {formatDate(doc.createdAt)}</Info>
          {doc.note && <div className="col-span-2 sm:col-span-4"><Info label="Note">{doc.note}</Info></div>}
          {doc.status === 'CANCELLED' && (
            <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">
              <Info label="Cancelled">{doc.cancelledBy} on {formatDate(doc.cancelledAt!)} — {doc.cancelReason}</Info>
            </div>
          )}
        </div>
      </Card>

      <Card title={`Items (${doc.lines?.length ?? 0})`} bodyClassName="p-0">
        <DataTable columns={columns} rows={doc.lines ?? []} rowKey={(l) => l.id} />
      </Card>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        size="sm"
        title={`Cancel ${doc.docNo}?`}
        description="The stock from this document will be reversed. The document stays in the history as Cancelled."
        footer={<><Button onClick={() => setCancelOpen(false)}>Keep it</Button><Button variant="danger" loading={busy} onClick={cancel}>Cancel document</Button></>}
      >
        <Input label="Reason" required placeholder="Entered by mistake" value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} error={error} autoFocus />
      </Modal>
    </>
  )
}
