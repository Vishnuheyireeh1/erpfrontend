import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/controlClass'
import { Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { spreadPayment } from '@/lib/spreadPayment'
import { useApiQuery } from '@/lib/useApiQuery'
import { paymentModeOptions, purchaseApi, supplierApi } from '../api/purchase.api'
import type { PaymentMode } from '../types'

type Props = { supplierId: number; supplierName: string; invoiceId?: number; onClose: () => void; onSaved: () => void }

const r2 = (n: number) => Math.round(n * 100) / 100

// Pay a supplier. Auto = oldest unpaid bills first; or type an amount per bill. Extra = advance.
export function PaymentModal({ supplierId, supplierName, invoiceId, onClose, onSaved }: Props) {
  const toast = useToast()
  const bills = useApiQuery(['unpaid', supplierId], () => supplierApi.unpaidBills(supplierId))
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PaymentMode>('CASH')
  const [reference, setReference] = useState('')
  const [docDate, setDocDate] = useState(todayISO)
  const [manual, setManual] = useState(Boolean(invoiceId))
  const [perBill, setPerBill] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const list = useMemo(() => bills.data ?? [], [bills.data])
  // Pre-fill once the bills arrive (paying one specific bill → its due amount).
  const [prefilled, setPrefilled] = useState(false)
  if (!prefilled && bills.data) {
    setPrefilled(true)
    const target = invoiceId ? list.find((b) => b.id === invoiceId) : undefined
    if (target) {
      setAmount(String(target.dueAmount))
      setPerBill({ [target.id]: String(target.dueAmount) })
    }
  }

  const total = Number(amount) || 0
  // Per-bill boxes follow the amount: this bill first, then the oldest (a part payment leaves the rest pending).
  const spread = (t: number) => spreadPayment(list, (b) => String(b.id), (b) => b.dueAmount, t, invoiceId ? String(invoiceId) : undefined)
  const allocated = manual ? r2(Object.values(perBill).reduce((s, v) => s + (Number(v) || 0), 0)) : Math.min(total, r2(list.reduce((s, b) => s + b.dueAmount, 0)))
  const advance = r2(total - allocated)

  const save = async () => {
    if (total <= 0) return setError('Enter the amount paid')
    if (manual && allocated > total + 0.004) return setError('Amounts against bills are more than the payment')
    setSaving(true)
    try {
      const allocations = manual
        ? Object.entries(perBill).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ invoiceId: Number(id), amount: Number(v) }))
        : undefined
      const p = await purchaseApi.pay({ supplierId, docDate, amount: total, mode, reference: reference || undefined, allocations })
      toast.success(`${p.docNo} saved — ${formatINR(total)} paid`)
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
      title={`Pay ${supplierName}`}
      description="Money the shop gives this supplier — cash, UPI or bank."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save — paid</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Amount ₹" required type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); if (manual) setPerBill(spread(Number(e.target.value) || 0)) }} autoFocus />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} options={paymentModeOptions} />
        <Input label="Reference" placeholder="UPI ref / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>

      <div className="mt-5">
        <Switch label="Choose which bill to pay" hint="Off: the oldest unpaid bill is paid first." checked={manual} onChange={(v) => { setManual(v); if (v) setPerBill(spread(total)) }} />
      </div>

      <div className="mt-3 rounded-card border border-line">
        {bills.loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : list.length === 0 ? (
          <p className="p-4 text-sm text-muted">No unpaid bills — the whole amount will be an advance.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{b.docNo} · bill {b.supplierInvoiceNo}</p>
                  <p className="text-xs text-muted">{formatDate(b.docDate)} · due {formatINR(b.dueAmount)}</p>
                </div>
                {manual && (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={b.dueAmount}
                    aria-label={`Pay against ${b.docNo}`}
                    value={perBill[b.id] ?? ''}
                    placeholder="0"
                    onChange={(e) => setPerBill((p) => ({ ...p, [b.id]: e.target.value }))}
                    className={cn(controlClass(), 'h-9 w-28! shrink-0 text-right')}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex justify-between text-sm">
        <span className="text-muted">Against bills {formatINR(allocated)}</span>
        <span className={advance > 0 ? 'font-medium text-success' : 'text-muted'}>Advance {formatINR(Math.max(0, advance))}</span>
      </div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
