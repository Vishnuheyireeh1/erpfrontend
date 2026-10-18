import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { qtyText, todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { salesApi } from '../api/sales.api'
import type { ReturnSource } from '../returnSource'
import type { PaymentMode } from '../types'

type Props = { source: ReturnSource; onClose: () => void; onSaved: (returnId: number) => void }

const r2 = (n: number) => Math.round(n * 100) / 100

// Customer brings goods back. Stock comes back in; the value first clears what is still due on the
// bill, the rest is refunded now — or kept as credit for the customer's next purchase.
export function SalesReturnModal({ source: sale, onClose, onSaved }: Props) {
  const toast = useToast()
  const returnable = sale.lines.map((l) => ({ line: l, left: Number(l.qty) - Number(l.returnedQty) })).filter((x) => x.left > 0)
  const [qty, setQty] = useState<Record<number, string>>({})
  const [reason, setReason] = useState('')
  const [docDate, setDocDate] = useState(todayISO)
  const [refund, setRefund] = useState<PaymentMode | 'CREDIT'>(sale.customerId ? 'CREDIT' : 'CASH')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const value = r2(sale.lines.reduce((s, l) => s + (Number(qty[l.id]) > 0 ? (Number(l.amount) * Number(qty[l.id])) / Number(l.qty) : 0), 0))
  const clearsDue = Math.min(value, sale.dueAmount)
  const rest = r2(value - clearsDue)
  const refundOptions = [...(sale.customerId ? [{ value: 'CREDIT', label: 'Keep as credit' }] : []), ...paymentModeOptions.map((o) => ({ value: o.value, label: `Refund by ${o.label}` }))]

  const save = async () => {
    const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ id: Number(id), qty: Number(v) }))
    if (lines.length === 0) return setError('Enter the quantity returned for at least one item')
    if (reason.trim().length < 3) return setError('Enter the reason')
    setSaving(true)
    try {
      const ret = await salesApi.createReturn({
        ...(sale.kind === 'INV' ? { invoiceId: sale.id } : { jobId: sale.id }),
        docDate, reason: reason.trim(), refundMode: refund === 'CREDIT' ? null : refund,
        lines: lines.map((l) => (sale.kind === 'INV' ? { salesLineId: l.id, qty: l.qty } : { jobMaterialId: l.id, qty: l.qty })),
      })
      toast.success(`${ret.docNo} saved — stock back in`)
      onSaved(ret.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Goods returned — ${sale.docNo}`}
      description={`From ${sale.customerName}. GST is reversed in proportion.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save return</Button></>}
    >
      <ul className="mb-4 divide-y divide-line rounded-card border border-line">
        {returnable.map(({ line, left }) => (
          <li key={line.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{line.description}</p>
              <p className="text-xs text-muted">Sold {qtyText(line.qty, line.unit)} at {formatINR(Number(line.amount))} · can return {qtyText(left)}</p>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={left}
              placeholder="0"
              aria-label={`Return qty for ${line.sku}`}
              value={qty[line.id] ?? ''}
              onChange={(e) => { setQty((q) => ({ ...q, [line.id]: e.target.value })); setError('') }}
              className={cn(controlClass(Number(qty[line.id]) > left ? 'x' : undefined), 'h-9 w-24 text-right')}
            />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Reason" required placeholder="Size issue / colour change" value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Select label="Money back" value={refund} onChange={(e) => setRefund(e.target.value as PaymentMode | 'CREDIT')} options={refundOptions} hint={sale.customerId ? 'Credit is used against their next bill' : 'Cash sale — refund now'} />
      </div>
      {value > 0 && (
        <div className="mt-4 flex flex-col gap-1 rounded-card bg-page px-3 py-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Return value</span><span className="font-medium">{formatINR(value)}</span></div>
          {clearsDue > 0 && <div className="flex justify-between"><span className="text-muted">Clears balance on this bill</span><span>{formatINR(clearsDue)}</span></div>}
          {rest > 0 && <div className="flex justify-between"><span className="text-muted">{refund === 'CREDIT' ? 'Kept as credit' : 'Give back now'}</span><span className="font-semibold text-ink">{formatINR(rest)}</span></div>}
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
