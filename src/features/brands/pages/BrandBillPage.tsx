import { IconArrowLeft, IconBan, IconCash, IconPrinter } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { MoreMenu } from '@/components/ui/MoreMenu'
import { useToast } from '@/components/ui/toast-context'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { printText } from '@/features/sales/print/printing'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandMoneyApi } from '../api/brandMoney.api'
import { BrandPaymentModal } from '../components/BrandPaymentModal'
import { brandBillText } from '../print/brandBillText'

// /brand-bills/:id — one delivery bill to a brand: lines, GST, what is still due, print.
export function BrandBillPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const q = useApiQuery(['brand-bill', id], () => brandMoneyApi.bill(id))
  const { profile, settings } = useBusinessProfile()
  const [modal, setModal] = useState<'' | 'pay' | 'cancel'>('')

  if (q.error) return <Card><EmptyState title="Couldn't open this bill" description={q.error} action={<Button onClick={() => navigate('/brand-orders')}>Brand orders</Button>} /></Card>
  const bill = q.data ?? q.lastData
  if (!bill) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const posted = bill.status === 'POSTED'
  const tax = Number(bill.cgstTotal) + Number(bill.sgstTotal) + Number(bill.igstTotal)
  const print = () => {
    if (!profile || !settings) return toast.error('Settings are still loading — try again')
    printText(brandBillText(bill, profile, settings['billing.print'].columns), settings['billing.print'])
  }

  return (
    <>
      <button type="button" onClick={() => navigate(`/brand-orders/${bill.order.id}`)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {bill.order.docNo}
      </button>
      <PageHeader
        title={bill.docNo}
        subtitle={`Delivery bill · ${bill.brandName} · ${formatDate(bill.docDate)}`}
        actions={
          <>
            <Button icon={IconPrinter} onClick={print}>Print bill</Button>
            {posted && bill.dueAmount > 0.004 && <Button variant="primary" icon={IconCash} onClick={() => setModal('pay')}>Money received</Button>}
            <MoreMenu items={[{ label: 'Cancel bill', icon: IconBan, onClick: () => setModal('cancel'), danger: true, hidden: !posted }]} />
          </>
        }
      />
      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Brand</p><Link to={`/brands/${bill.brand.id}`} className="text-brand hover:underline">{bill.brand.name}</Link>{bill.brandGstin && <p className="font-mono text-xs">{bill.brandGstin}</p>}</div>
          <div><p className="text-xs text-muted">Order</p><Link to={`/brand-orders/${bill.order.id}`} className="text-brand hover:underline">{bill.order.docNo}</Link>{bill.order.theirOrderNo && <p className="text-xs text-muted">Their no. {bill.order.theirOrderNo}</p>}</div>
          <div><p className="text-xs text-muted">Total</p><p className="text-lg font-semibold">{formatINR(Number(bill.grandTotal))}</p></div>
          <div>
            <p className="text-xs text-muted">Status</p>
            {!posted ? <Badge>Cancelled</Badge> : bill.dueAmount > 0.004 ? <Badge tone={bill.dueAmount < Number(bill.grandTotal) ? 'pending' : 'warn'}>{formatINR(bill.dueAmount)} to receive</Badge> : <Badge tone="success">Paid</Badge>}
          </div>
          {bill.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Note</p>{bill.notes}</div>}
          {!posted && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {bill.cancelReason}</div>}
        </div>
      </Card>
      <Card title="Lines" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-4 py-2 font-medium">#</th><th className="font-medium">Particulars</th><th className="text-right font-medium">Rate</th><th className="text-right font-medium">Qty</th><th className="px-4 text-right font-medium">Amount</th></tr></thead>
            <tbody>
              {bill.lines.map((l, i) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="px-4 py-2 text-muted">{l.kind === 'PIECE' ? bill.lines.slice(0, i + 1).filter((x) => x.kind === 'PIECE').length : ''}</td>
                  <td className={l.kind === 'ITEM' ? 'pl-4 text-ink-soft' : ''}>{l.kind === 'ITEM' ? '+ ' : ''}{l.description}{l.endCustomer && <span className="text-ink-soft"> · {l.endCustomer}</span>}</td>
                  <td className="text-right">{formatINR(Number(l.rate))}</td>
                  <td className="text-right">{Number(l.qty)} {l.unit}</td>
                  <td className="px-4 text-right font-medium">{formatINR(Number(l.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto flex max-w-sm flex-col gap-1 p-4 text-sm">
          {tax > 0 && <div className="flex justify-between"><dt className="text-muted">Before GST</dt><dd>{formatINR(Number(bill.taxableTotal))}</dd></div>}
          {tax > 0 && bill.taxMode === 'INTRA' && <div className="flex justify-between"><dt className="text-muted">CGST + SGST ({Number(bill.gstRate)}%)</dt><dd>{formatINR(tax)}</dd></div>}
          {tax > 0 && bill.taxMode === 'INTER' && <div className="flex justify-between"><dt className="text-muted">IGST ({Number(bill.gstRate)}%)</dt><dd>{formatINR(tax)}</dd></div>}
          {Number(bill.roundOff) !== 0 && <div className="flex justify-between"><dt className="text-muted">Round off</dt><dd>{formatINR(Number(bill.roundOff))}</dd></div>}
          <div className="flex justify-between border-t border-line pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatINR(Number(bill.grandTotal))}</dd></div>
          <p className="text-xs text-muted">Rupees {bill.amountInWords}</p>
        </dl>
      </Card>
      {modal === 'pay' && <BrandPaymentModal brandId={bill.brandId} brandName={bill.brandName} pending={bill.dueAmount} suggest={bill.dueAmount} onClose={() => setModal('')} onSaved={() => { setModal(''); q.reload() }} />}
      {modal === 'cancel' && (
        <CancelDocModal docNo={bill.docNo} effect="The pieces on this bill go back to Ready (not delivered) and the brand no longer owes this amount."
          onCancel={(reason) => brandMoneyApi.cancelBill(bill.id, reason)} onClose={() => setModal('')} onDone={() => { setModal(''); q.reload() }} />
      )}
    </>
  )
}
