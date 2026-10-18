import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { itemTitle, qtyText, todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { purchaseApi } from '../api/purchase.api'
import type { Bill } from '../types'

type Props = { bill: Bill; onClose: () => void; onSaved: () => void }

// Send goods back to the supplier (debit note). Stock goes out at the original purchase cost.
export function ReturnModal({ bill, onClose, onSaved }: Props) {
  const toast = useToast()
  const returnable = bill.lines.map((l) => ({ line: l, left: Number(l.qty) - Number(l.returnedQty) })).filter((x) => x.left > 0)
  const [qty, setQty] = useState<Record<number, string>>({})
  const [reason, setReason] = useState('')
  const [docDate, setDocDate] = useState(todayISO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ purchaseLineId: Number(id), qty: Number(v) }))
    if (lines.length === 0) return setError('Enter the quantity to return for at least one item')
    if (reason.trim().length < 3) return setError('Enter the reason')
    setSaving(true)
    try {
      const ret = await purchaseApi.createReturn({ invoiceId: bill.id, docDate, reason: reason.trim(), lines })
      toast.success(`${ret.docNo} saved — stock reduced`)
      onSaved()
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
      title={`Return goods — ${bill.docNo}`}
      description={`Back to ${bill.supplier.name}. GST is reversed in proportion.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save return</Button></>}
    >
      <ul className="mb-4 divide-y divide-line rounded-card border border-line">
        {returnable.map(({ line, left }) => (
          <li key={line.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{itemTitle(line.variant)}</p>
              <p className="text-xs text-muted">Bought {qtyText(line.qty, line.variant.product.unit.code)} · can return {qtyText(left)}</p>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={left}
              placeholder="0"
              aria-label={`Return qty for ${line.variant.sku}`}
              value={qty[line.id] ?? ''}
              onChange={(e) => { setQty((q) => ({ ...q, [line.id]: e.target.value })); setError('') }}
              className={cn(controlClass(Number(qty[line.id]) > left ? 'x' : undefined), 'h-9 w-24 text-right')}
            />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Input label="Reason" required placeholder="Defective / wrong colour" value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
