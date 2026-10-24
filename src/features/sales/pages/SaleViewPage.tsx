import { IconArrowBackUp, IconArrowLeft, IconBan, IconCash, IconFileTypePdf, IconPencil, IconPlus, IconPrinter } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { qtyText } from '@/features/inventory/constants'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { salesApi } from '../api/sales.api'
import { ReceiptModal } from '../components/ReceiptModal'
import { SalesReturnModal } from '../components/SalesReturnModal'
import { billText } from '../print/billText'
import { fetchFile, printText } from '../print/printing'
import type { SaleLine } from '../types'
import { saleReturnSource } from '../returnSource'
import { BookNoChip } from '../components/BookNoChip'
import { saleState, tenderText } from '../status'

const money = (v: string | number) => formatINR(Number(v))

const lineColumns: Column<SaleLine>[] = [
  { key: 'item', header: 'Item', mobile: 'title', render: (l) => <Link to={`/stock/items/${l.variant.id}`} className="font-medium text-ink hover:underline">{l.description}</Link> },
  { key: 'qty', header: 'Qty', align: 'right', mobile: 'subtitle', render: (l) => `${qtyText(l.qty, l.variant.product.unit.code)}${Number(l.returnedQty) > 0 ? ` (${qtyText(l.returnedQty)} returned)` : ''}` },
  { key: 'rate', header: 'Rate', align: 'right', render: (l) => `${money(l.rate)}${Number(l.discountPct) ? ` −${Number(l.discountPct)}%` : ''}` },
  { key: 'gst', header: 'GST (incl.)', align: 'right', render: (l) => `${Number(l.gstRate)}% · ${money(Number(l.cgst) + Number(l.sgst) + Number(l.igst))}` },
  { key: 'amount', header: 'Amount', align: 'right', render: (l) => <span className="font-medium">{money(Number(l.qty) * Number(l.rate) * (1 - Number(l.discountPct) / 100))}</span> },
]

// /sales/:id — one sales bill: print, PDF, receive balance, returns, cancel.
export function SaleViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, settings } = useBusinessProfile()
  const q = useApiQuery(['sale', id], () => salesApi.get(id))
  const [modal, setModal] = useState<'' | 'receive' | 'return' | 'cancel'>('')
  const [pdfBusy, setPdfBusy] = useState(false)

  if (q.error) return <Card><EmptyState title="Couldn't open this bill" description={q.error} action={<Button onClick={() => navigate('/sales')}>All bills</Button>} /></Card>
  const b = q.data ?? q.lastData
  if (!b) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const state = saleState(b)
  const posted = b.status === 'POSTED'
  const canReturn = posted && b.lines.some((l) => Number(l.qty) > Number(l.returnedQty))
  // Edit (same number): bills of this month with no returns — earlier months may already be in a GST return.
  const thisMonth = todayISO().slice(0, 7)
  const canEdit = posted && b.docDate.slice(0, 7) === thisMonth && !b.returns.some((r) => r.status === 'POSTED')
  const done = () => { setModal(''); q.reload() }

  const print = () => {
    if (!profile || !settings) return toast.error('Settings are still loading — try again')
    printText(billText(b, profile, settings['billing.print'].columns), settings['billing.print'])
  }
  const pdf = async () => {
    setPdfBusy(true)
    try { await fetchFile(`/sales/${b.id}/pdf`) } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not download') } finally { setPdfBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/sales')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Sales
      </button>
      <PageHeader
        title={b.docNo}
        subtitle={`${b.customerName}${b.customerPhone ? ` · ${b.customerPhone}` : ''} · ${formatDate(b.docDate)}`}
        actions={
          <>
            <Button icon={IconPrinter} onClick={print}>Print</Button>
            <Button icon={IconFileTypePdf} loading={pdfBusy} onClick={pdf}>PDF</Button>
            {posted && b.dueAmount > 0.004 && b.customerId && <Button icon={IconCash} onClick={() => setModal('receive')}>Receive balance</Button>}
            {canReturn && <Button icon={IconArrowBackUp} onClick={() => setModal('return')}>Goods returned</Button>}
            {canEdit && <Button icon={IconPencil} onClick={() => navigate(`/billing?edit=${b.id}`)}>Edit bill</Button>}
            {posted && <Button variant="danger" icon={IconBan} onClick={() => setModal('cancel')}>Cancel bill</Button>}
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/billing')}>New bill</Button>
          </>
        }
      />
      <BookNoChip bookNo={b.bookNo} docNo={b.docNo} onSave={(v) => salesApi.setBookNo(b.id, v)} onSaved={q.reload} />


      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted">Status</p><Badge tone={state.tone}>{state.label}</Badge></div>
            <div>
              <p className="text-xs text-muted">Customer</p>
              {b.customer ? <Link to={`/customers/${b.customer.id}`} className="text-brand hover:underline">{b.customer.name}</Link> : b.customerName}
            </div>
            <div><p className="text-xs text-muted">GST</p>{b.taxMode === 'INTRA' ? 'CGST + SGST' : 'IGST'}{b.customerGstin ? ` · ${b.customerGstin}` : ''}</div>
            <div><p className="text-xs text-muted">Profit (before GST)</p>{posted ? money(b.profit) : '—'}</div>
            <div className="col-span-2 text-xs text-muted sm:col-span-4">
              Billed by {b.createdBy} at {new Date(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
              {Number(b.changeReturned) > 0 && ` · cash ${money(b.cashTendered)}, change ${money(b.changeReturned)}`}
              {b.notes ? ` · ${b.notes}` : ''}
            </div>
            {b.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled by {b.cancelledBy} — {b.cancelReason}</div>}
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">Items</span>{money(b.grossTotal)}</div>
            {Number(b.discountTotal) > 0 && <div className="flex justify-between"><span className="text-muted">Discount</span><span className="text-success">− {money(b.discountTotal)}</span></div>}
            {Number(b.roundOff) !== 0 && <div className="flex justify-between"><span className="text-muted">Round off</span>{Number(b.roundOff).toFixed(2)}</div>}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span>{money(b.grandTotal)}</div>
            <div className="flex justify-between"><span className="text-muted">Received</span>{money(b.paidAmount)}</div>
            {Number(b.returnedAmount) > 0 && <div className="flex justify-between"><span className="text-muted">Returned</span>{money(b.returnedAmount)}</div>}
            <div className="flex justify-between font-medium"><span>Balance</span><span className={b.dueAmount > 0 ? 'text-warn' : 'text-success'}>{formatINR(b.dueAmount)}</span></div>
            <p className="mt-1 text-xs text-muted">
              GST included: taxable {money(b.taxableTotal)} · {b.taxMode === 'INTRA' ? `CGST ${money(b.cgstTotal)} · SGST ${money(b.sgstTotal)}` : `IGST ${money(b.igstTotal)}`}
            </p>
          </div>
        </Card>
      </div>

      <Card title={`Items (${b.lines.length})`} bodyClassName="p-0" className="mb-5">
        <DataTable columns={lineColumns} rows={b.lines} rowKey={(l) => l.id} />
      </Card>

      {(b.allocations.length > 0 || b.returns.length > 0 || (b.credits ?? []).length > 0) && (
        <Card title="Money received and returns">
          <ul className="flex flex-col gap-2 text-sm">
            {b.allocations.map((a) => (
              <li key={`p${a.id}`} className="flex justify-between gap-3">
                <Link to={`/sales/receipts/${a.receipt.id}`} className="text-brand hover:underline">{a.receipt.docNo}</Link>
                <span className="text-ink-soft">{formatDate(a.receipt.docDate)} · {tenderText(a.receipt)}</span>
                <span className="font-medium">{money(a.amount)}</span>
              </li>
            ))}
            {(b.credits ?? []).map((c) => (
              <li key={`c${c.id}`} className="flex justify-between gap-3">
                <Link to={`/sales/returns/${c.return.id}`} className="text-brand hover:underline">{c.return.docNo}</Link>
                <span className="text-ink-soft">Return credit used</span>
                <span className="font-medium">{money(c.amount)}</span>
              </li>
            ))}
            {b.returns.map((r) => (
              <li key={`r${r.id}`} className="flex justify-between gap-3">
                <Link to={`/sales/returns/${r.id}`} className="text-brand hover:underline">{r.docNo}</Link>
                <span className="text-ink-soft">{formatDate(r.docDate)} · Return{Number(r.refundAmount) > 0 ? `, refunded ${money(r.refundAmount)}` : ''}{r.status === 'CANCELLED' ? ' (cancelled)' : ''}</span>
                <span className="font-medium">{money(r.grandTotal)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modal === 'receive' && b.customerId && <ReceiptModal customerId={b.customerId} customerName={b.customerName} target={{ kind: 'INV', id: b.id }} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'return' && <SalesReturnModal source={saleReturnSource(b)} onClose={() => setModal('')} onSaved={(rid) => navigate(`/sales/returns/${rid}`)} />}
      {modal === 'cancel' && (
        <CancelDocModal docNo={b.docNo} effect={b.customerId ? "The items go back into stock. Money paid on it stays as the customer's advance — cancel that receipt too if you gave the money back." : "The items go back into stock and the money taken is reversed."} onCancel={(r) => salesApi.cancel(b.id, r)} onClose={() => setModal('')} onDone={done} />
      )}
    </>
  )
}
