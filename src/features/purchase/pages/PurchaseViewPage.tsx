import { IconArrowBackUp, IconArrowLeft, IconBan, IconBarcode, IconCash, IconTruck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { paymentModeLabels, purchaseApi } from '../api/purchase.api'
import { CancelDocModal } from '../components/CancelDocModal'
import { FreightPayModal } from '../components/FreightPayModal'
import { PaymentModal } from '../components/PaymentModal'
import { ReturnModal } from '../components/ReturnModal'
import type { Bill, BillLine } from '../types'

const money = (v: string | number) => formatINR(Number(v))

const lineColumns: Column<BillLine>[] = [
  { key: 'item', header: 'Item', mobile: 'title', render: (l) => <Link to={`/stock/items/${l.variant.id}`} className="font-medium text-ink hover:underline">{itemTitle(l.variant)}</Link> },
  { key: 'qty', header: 'Qty', align: 'right', mobile: 'subtitle', render: (l) => `${qtyText(l.qty, l.variant.product.unit.code)}${Number(l.returnedQty) > 0 ? ` (${qtyText(l.returnedQty)} returned)` : ''}` },
  { key: 'rate', header: 'Rate', align: 'right', render: (l) => `${money(l.rate)}${Number(l.discountPct) ? ` −${Number(l.discountPct)}%` : ''}` },
  { key: 'taxable', header: 'Taxable', align: 'right', render: (l) => money(l.taxable) },
  { key: 'gst', header: 'GST', align: 'right', render: (l) => `${Number(l.gstRate)}% · ${money(Number(l.cgst) + Number(l.sgst) + Number(l.igst))}` },
  { key: 'total', header: 'Total', align: 'right', render: (l) => <span className="font-medium">{money(l.lineTotal)}</span> },
  { key: 'cost', header: 'Stock cost / unit', align: 'right', mobile: 'hidden', render: (l) => <span className="text-ink-soft">{money(l.unitCost)}</span> },
]

function payState(b: Bill) {
  if (b.status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' as const }
  if (b.dueAmount <= 0.004) return { label: 'Paid', tone: 'success' as const }
  return Number(b.paidAmount) > 0 ? { label: 'Part paid', tone: 'pending' as const } : { label: 'Unpaid', tone: 'warn' as const }
}

// /purchase/:id — one purchase bill with its payments and returns.
export function PurchaseViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['bill', id], () => purchaseApi.get(id))
  const [modal, setModal] = useState<'' | 'pay' | 'return' | 'cancel' | 'freight'>('')

  if (q.error) return <Card><EmptyState title="Couldn't open this bill" description={q.error} action={<Button onClick={() => navigate('/purchase')}>All bills</Button>} /></Card>
  const b = q.data ?? q.lastData
  if (!b) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const state = payState(b)
  const posted = b.status === 'POSTED'
  const canReturn = posted && b.lines.some((l) => Number(l.qty) > Number(l.returnedQty))
  const done = () => { setModal(''); q.reload() }
  const tax = b.taxMode === 'INTRA' ? [['CGST', b.cgstTotal], ['SGST', b.sgstTotal]] : [['IGST', b.igstTotal]]

  return (
    <>
      <button type="button" onClick={() => navigate('/purchase')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Purchase
      </button>
      <PageHeader
        title={b.docNo}
        subtitle={`${b.supplier.name} · supplier bill ${b.supplierInvoiceNo} dated ${formatDate(b.supplierInvoiceDate)}`}
        actions={
          posted && (
            <>
              <Button icon={IconBarcode} onClick={() => navigate(`/labels?purchase=${b.id}`)}>Print labels</Button>
              {b.dueAmount > 0.004 && <Button icon={IconCash} onClick={() => setModal('pay')}>Pay supplier</Button>}
              {Number(b.freightSeparate) > 0 && !b.freightMode && <Button icon={IconTruck} onClick={() => setModal('freight')}>Pay freight</Button>}
              {canReturn && <Button icon={IconArrowBackUp} onClick={() => setModal('return')}>Return goods</Button>}
              <Button variant="danger" icon={IconBan} onClick={() => setModal('cancel')}>Cancel bill</Button>
            </>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted">Status</p><Badge tone={state.tone}>{state.label}</Badge></div>
            <div><p className="text-xs text-muted">Supplier</p><Link to={`/suppliers/${b.supplier.id}`} className="text-brand hover:underline">{b.supplier.name}</Link></div>
            <div><p className="text-xs text-muted">Received</p>{formatDate(b.docDate)}</div>
            <div><p className="text-xs text-muted">GST</p>{b.taxMode === 'INTRA' ? 'CGST + SGST' : `IGST (${b.supplierStateName})`}</div>
            <div className="col-span-2 sm:col-span-4 text-xs text-muted">Saved by {b.createdBy} on {formatDate(b.createdAt)}{b.notes ? ` · ${b.notes}` : ''}</div>
            {b.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled by {b.cancelledBy} on {formatDate(b.cancelledAt!)} — {b.cancelReason}</div>}
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-1.5 text-sm">
            {Number(b.billDiscount) > 0 && <div className="flex justify-between"><span className="text-muted">Cash discount{Number(b.billDiscountPct) ? ` ${Number(b.billDiscountPct)}%` : ''}</span>− {money(b.billDiscount)}</div>}
            <div className="flex justify-between"><span className="text-muted">Taxable</span>{money(b.taxableTotal)}</div>
            {tax.map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted">{k}</span>{money(v)}</div>)}
            {Number(b.otherCharges) > 0 && <div className="flex justify-between"><span className="text-muted">Packing / other charges{Number(b.chargesTax) > 0 ? ` (+ GST ${Number(b.chargesGstRate)}% in GST above)` : ''}</span>{money(b.otherCharges)}</div>}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span>{money(b.grandTotal)}</div>
            <div className="flex justify-between"><span className="text-muted">Paid</span>{money(b.paidAmount)}</div>
            {Number(b.returnedAmount) > 0 && <div className="flex justify-between"><span className="text-muted">Returned</span>{money(b.returnedAmount)}</div>}
            <div className="flex justify-between font-medium"><span>Due</span><span className={b.dueAmount > 0 ? 'text-warn' : 'text-success'}>{formatINR(b.dueAmount)}</span></div>
            {Number(b.freightSeparate) > 0 && (
              <p className={b.freightMode ? 'text-xs text-muted' : 'text-xs font-medium text-warn'}>
                Freight (lorry) {money(b.freightSeparate)}{b.freightNote ? ` (${b.freightNote})` : ''} — {b.freightMode ? `paid to the transporter by ${paymentModeLabels[b.freightMode]} on ${formatDate(b.freightPaidOn!)}` : 'still to pay the transporter'}. In the items' cost, not owed to this supplier.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title={`Items (${b.lines.length})`} bodyClassName="p-0" className="mb-5">
        <DataTable columns={lineColumns} rows={b.lines} rowKey={(l) => l.id} />
      </Card>

      {(b.allocations.length > 0 || b.returns.length > 0) && (
        <Card title="Payments and returns">
          <ul className="flex flex-col gap-2 text-sm">
            {b.allocations.map((a) => (
              <li key={`p${a.id}`} className="flex justify-between gap-3">
                <Link to={`/purchase/payments/${a.payment.id}`} className="text-brand hover:underline">{a.payment.docNo}</Link>
                <span className="text-ink-soft">{formatDate(a.payment.docDate)} · {paymentModeLabels[a.payment.mode]}</span>
                <span className="font-medium">{money(a.amount)}</span>
              </li>
            ))}
            {b.returns.map((r) => (
              <li key={`r${r.id}`} className="flex justify-between gap-3">
                <Link to={`/purchase/returns/${r.id}`} className="text-brand hover:underline">{r.docNo}</Link>
                <span className="text-ink-soft">{formatDate(r.docDate)} · Return{r.status === 'CANCELLED' ? ' (cancelled)' : ''}</span>
                <span className="font-medium">{money(r.grandTotal)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modal === 'pay' && <PaymentModal supplierId={b.supplier.id} supplierName={b.supplier.name} invoiceId={b.id} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'freight' && <FreightPayModal bill={b} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'return' && <ReturnModal bill={b} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'cancel' && (
        <CancelDocModal docNo={b.docNo} effect="The stock from this bill will be taken out again." onCancel={(r) => purchaseApi.cancel(b.id, r)} onClose={() => setModal('')} onDone={done} />
      )}
    </>
  )
}
